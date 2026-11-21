// Stav projektu (místnosti, překážky, nábytek) a akce, které ho mění. Žádné UI věci (výběr, nástroj) - ty jsou v uiStore.
import { create } from 'zustand'
import { DEFAULT_ROOM_HEIGHT, DEFAULT_WALL_THICKNESS, MAX_WALL, MIN_WALL } from '../config'
import { OBSTACLE_KINDS, ROOM_TYPES } from '../domain/catalog'
import { ELECTRIC_KINDS } from '../domain/electricCatalog'
import { FURNITURE_KINDS } from '../domain/furnitureCatalog'
import { DEFAULT_CEILING, DEFAULT_WALL_MATERIAL } from '../domain/materials'
import { createInitialProject } from '../domain/project'
import type {
  Cable, CableType, ElectricKind, ElectricPoint, Furniture, FurnitureKind, Obstacle, ObstacleKind, Placed, Project, Rect,
  Room, RoomShape, WallMode, Waypoint,
} from '../domain/types'
import { autoRoute, cablePolyline, planAutoConnections, runHeight } from '../geometry/electric'
import { magnetizeRoom } from '../geometry/magnet'
import { clamp } from '../geometry/math'
import { resolvePlacement, rotatedPatch } from '../geometry/placement'
import { bbox, edgeInfo, setEdgeLength, translatePts } from '../geometry/polygon'
import { rectPts, shapePts } from '../geometry/shapes'
import { applyWallThickness, buildWallModel } from '../geometry/walls'

interface ProjectState extends Project {
  loadProject: (project: Project) => void
  /** Přidá místnost vpravo od ostatních (se sdílenou zdí). Vrací id nové místnosti. */
  addRoom: (shape: RoomShape) => string
  /** Přidá obdélníkovou místnost nakreslenou uživatelem a přitáhne ji k sousedům. */
  addRoomFromRect: (rect: Rect) => string
  updateRoom: (id: string, patch: Partial<Room>) => void
  moveRoom: (id: string, dx: number, dy: number) => void
  deleteRoom: (id: string) => void
  /** Nastaví délku stěny (posune navazující stěnu). Neplatná hodnota se ignoruje. */
  setWallLength: (roomId: string, edge: number, length: number) => void
  /** Nastaví tloušťku zdi; u sdílené zdi drží její osu (viz geometry/walls.ts). */
  setWallThickness: (roomId: string, edge: number, thickness: number) => void
  /** Nastaví zobrazení stěny (auto / plná / skrytá); u sdílené zdi i na straně sousední místnosti, ať zeď zmizí celá. */
  setWallMode: (roomId: string, edge: number, mode: WallMode) => void

  addObstacle: (kind: ObstacleKind, roomId: string) => string | null
  updateObstacle: (id: string, patch: Partial<Obstacle>) => void
  deleteObstacle: (id: string) => void

  /** Přidá nábytek do místnosti (připnutý uprostřed první stěny). Vrací id. */
  addFurniture: (kind: FurnitureKind, roomId: string) => string | null
  updateFurniture: (id: string, patch: Partial<Furniture>) => void
  /** Otočí nábytek o `degrees` (výchozí 90°) kolem jeho středu. U zdi zůstane, pokud je nové natočení rovnoběžné se zdí. */
  rotateFurniture: (id: string, degrees?: number) => void
  /** Nastaví natočení nábytku na libovolný úhel ve stupních (rovnoběžné se zdí zůstane u zdi, jinak se uvolní). */
  setFurnitureRotation: (id: string, degrees: number) => void
  deleteFurniture: (id: string) => void

  /** Přidá elektrický bod do místnosti (nástěnný uprostřed první stěny, světlo uprostřed místnosti). */
  addElectric: (kind: ElectricKind, roomId: string) => string | null
  updateElectric: (id: string, patch: Partial<ElectricPoint>) => void
  /** Smaže bod i všechny kabely, které do něj vedou. */
  deleteElectric: (id: string) => void

  /** Propojí dva body kabelem s automaticky vytvořenou trasou. Vrací id kabelu. */
  addCable: (fromId: string, toId: string, type: CableType) => string | null
  updateCable: (id: string, patch: Partial<Cable>) => void
  deleteCable: (id: string) => void
  /** Zahodí ruční úpravy a vytvoří trasu znovu automaticky. */
  rerouteCable: (id: string) => void
  /**
   * "Přetrasovat vše": napojí nenapojené body (vypínače na rozvaděč, světla na nejbližší vypínač, zásuvky k rozvaděči a řetězově) a pak znovu
   * automaticky přetrasuje všechny kabely. Vrací počet nově vytvořených kabelů a počet přetrasovaných.
   */
  autoConnectAndRerouteAll: () => { added: number; rerouted: number }
  /**
   * Napojí jeden bod automaticky podle stejných pravidel (nemá-li kabel) a přetrasuje jen kabely tohoto bodu.
   * Ostatní kabely se nedotknou, takže po přidání zásuvky nemusíte přetrasovávat celý byt.
   */
  autoConnectPoint: (pointId: string) => { added: number; rerouted: number }
  insertWaypoint: (cableId: string, index: number, waypoint: Waypoint) => void
  updateWaypoint: (cableId: string, index: number, patch: Partial<Waypoint>) => void
  deleteWaypoint: (cableId: string, index: number) => void
}

const newId = () => crypto.randomUUID()

function newRoom(pts: Room['pts']): Room {
  return {
    id: newId(), name: ROOM_TYPES.other.label, type: 'other', pts,
    walls: pts.map(() => DEFAULT_WALL_THICKNESS), height: DEFAULT_ROOM_HEIGHT,
    wallMaterials: pts.map(() => DEFAULT_WALL_MATERIAL), wallModes: pts.map(() => 'auto' as const), ceiling: { ...DEFAULT_CEILING },
  }
}

/** Kam umístit další místnost: vedle nejpravější, zarovnanou nahoru, s jednou sdílenou zdí. */
function nextRoomOrigin(rooms: Room[]) {
  if (rooms.length === 0) return { x: 0, y: 0 }
  const boxes = rooms.map(r => bbox(r.pts))
  return {
    x: Math.max(...boxes.map(b => b.maxX)) + DEFAULT_WALL_THICKNESS,
    y: Math.min(...boxes.map(b => b.minY)),
  }
}

/** Společná část nové věci v místnosti: rozměry z katalogu a připnutí uprostřed první stěny. */
function newPlaced(
  room: Room,
  dims: { w: number; d: number; h: number; elev: number },
): Omit<Placed, 'id'> {
  const box = bbox(room.pts)
  return {
    roomId: room.id, ...dims,
    x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2, rot: 0,
    attach: { edge: 0, along: edgeInfo(room.pts, 0).len / 2 },
  }
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  ...createInitialProject(),

  loadProject: project => set({
    rooms: project.rooms, obstacles: project.obstacles, furniture: project.furniture,
    electric: project.electric, cables: project.cables,
  }),

  addRoom: shape => {
    const { x, y } = nextRoomOrigin(get().rooms)
    const room = newRoom(shapePts(shape, x, y, 400, 300))
    set(s => ({ rooms: [...s.rooms, room] }))
    return room.id
  },

  addRoomFromRect: rect => {
    const others = get().rooms.map(r => r.pts)
    const room = newRoom(magnetizeRoom(rectPts(rect), others, DEFAULT_WALL_THICKNESS))
    set(s => ({ rooms: [...s.rooms, room] }))
    return room.id
  },

  updateRoom: (id, patch) =>
    set(s => ({ rooms: s.rooms.map(r => (r.id === id ? { ...r, ...patch } : r)) })),

  moveRoom: (id, dx, dy) =>
    set(s => {
      // volně stojící věci se posunou s místností; připnuté se přepočítají ze stěny samy
      const shift = <T extends Placed>(item: T): T => (item.roomId === id ? { ...item, x: item.x + dx, y: item.y + dy } : item)
      // kabely, které začínají i končí v téhle místnosti, jedou s ní; ostatní zůstanou (lze je přetrasovat)
      const inRoom = (pointId: string) => s.electric.find(p => p.id === pointId)?.roomId === id
      return {
        rooms: s.rooms.map(r => (r.id === id ? { ...r, pts: translatePts(r.pts, dx, dy) } : r)),
        obstacles: s.obstacles.map(shift),
        furniture: s.furniture.map(shift),
        electric: s.electric.map(p => (p.roomId === id ? { ...p, x: p.x + dx, y: p.y + dy } : p)),
        cables: s.cables.map(c =>
          inRoom(c.fromId) && inRoom(c.toId) ? { ...c, via: c.via.map(w => ({ ...w, x: w.x + dx, y: w.y + dy })) } : c),
      }
    }),

  deleteRoom: id =>
    set(s => {
      const electric = s.electric.filter(p => p.roomId !== id)
      const alive = new Set(electric.map(p => p.id))
      return {
        rooms: s.rooms.filter(r => r.id !== id),
        obstacles: s.obstacles.filter(o => o.roomId !== id),
        furniture: s.furniture.filter(f => f.roomId !== id),
        electric,
        cables: s.cables.filter(c => alive.has(c.fromId) && alive.has(c.toId)),
      }
    }),

  setWallLength: (roomId, edge, length) => {
    const room = get().rooms.find(r => r.id === roomId)
    if (!room || !(length > 0)) return
    get().updateRoom(roomId, { pts: setEdgeLength(room.pts, edge, length) })
  },

  setWallThickness: (roomId, edge, thickness) => {
    const next = applyWallThickness(get().rooms, roomId, edge, clamp(thickness, MIN_WALL, MAX_WALL))
    if (next) set({ rooms: next })
  },

  setWallMode: (roomId, edge, mode) => {
    const { rooms } = get()
    const sides = [{ roomId, edge }, ...buildWallModel(rooms).info(roomId, edge).partners]
    set({
      rooms: rooms.map(r => ({
        ...r,
        wallModes: r.wallModes.map((m, i) => (sides.some(s => s.roomId === r.id && s.edge === i) ? mode : m)),
      })),
    })
  },

  addObstacle: (kind, roomId) => {
    const room = get().rooms.find(r => r.id === roomId)
    if (!room) return null
    const obstacle: Obstacle = { id: newId(), kind, ...newPlaced(room, OBSTACLE_KINDS[kind]) }
    set(s => ({ obstacles: [...s.obstacles, obstacle] }))
    return obstacle.id
  },

  updateObstacle: (id, patch) =>
    set(s => ({ obstacles: s.obstacles.map(o => (o.id === id ? { ...o, ...patch } : o)) })),

  deleteObstacle: id => set(s => ({ obstacles: s.obstacles.filter(o => o.id !== id) })),

  addFurniture: (kind, roomId) => {
    const room = get().rooms.find(r => r.id === roomId)
    if (!room) return null
    const furniture: Furniture = { id: newId(), kind, ...newPlaced(room, FURNITURE_KINDS[kind]) }
    set(s => ({ furniture: [...s.furniture, furniture] }))
    return furniture.id
  },

  updateFurniture: (id, patch) =>
    set(s => ({ furniture: s.furniture.map(f => (f.id === id ? { ...f, ...patch } : f)) })),

  rotateFurniture: (id, degrees = 90) => {
    const { furniture, rooms } = get()
    const item = furniture.find(f => f.id === id)
    if (!item) return
    const room = rooms.find(r => r.id === item.roomId)
    const current = room ? resolvePlacement(item, room, buildWallModel(rooms)).rot : item.rot
    get().setFurnitureRotation(id, (current * 180) / Math.PI + degrees)
  },

  setFurnitureRotation: (id, degrees) => {
    const { furniture, rooms } = get()
    const item = furniture.find(f => f.id === id)
    if (!item) return
    const patch = rotatedPatch(item, rooms.find(r => r.id === item.roomId), buildWallModel(rooms), (degrees * Math.PI) / 180)
    // ručně natočený kus si při dalším přichycení ke zdi drží natočení (postel bokem se přichytí bokem)
    get().updateFurniture(id, { ...patch, keepRotation: true })
  },

  deleteFurniture: id => set(s => ({ furniture: s.furniture.filter(f => f.id !== id) })),

  addElectric: (kind, roomId) => {
    const room = get().rooms.find(r => r.id === roomId)
    if (!room) return null
    const spec = ELECTRIC_KINDS[kind]
    const box = bbox(room.pts)
    const point: ElectricPoint = {
      id: newId(), roomId, kind, name: '', height: spec.height,
      x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2,   // světlo: střed místnosti
      // nástěnný bod se přidá do čtvrtiny první stěny: na středu by ho zakrývala kóta s délkou stěny
      attach: spec.mount === 'wall' ? { edge: 0, along: edgeInfo(room.pts, 0).len * 0.25 } : undefined,
    }
    set(s => ({ electric: [...s.electric, point] }))
    return point.id
  },

  updateElectric: (id, patch) =>
    set(s => ({ electric: s.electric.map(p => (p.id === id ? { ...p, ...patch } : p)) })),

  deleteElectric: id =>
    set(s => ({
      electric: s.electric.filter(p => p.id !== id),
      cables: s.cables.filter(c => c.fromId !== id && c.toId !== id),   // kabel bez konce nedává smysl
    })),

  addCable: (fromId, toId, type) => {
    if (fromId === toId) return null
    const cable: Cable = {
      id: newId(), type, circuit: `Okruh ${get().cables.length + 1}`, fromId, toId, via: [],
    }
    set(s => ({ cables: [...s.cables, cable] }))
    get().rerouteCable(cable.id)
    return cable.id
  },

  updateCable: (id, patch) =>
    set(s => ({ cables: s.cables.map(c => (c.id === id ? { ...c, ...patch } : c)) })),

  deleteCable: id => set(s => ({ cables: s.cables.filter(c => c.id !== id) })),

  rerouteCable: id => {
    const { cables, electric, rooms } = get()
    const cable = cables.find(c => c.id === id)
    const polyline = cable && cablePolyline({ ...cable, via: [] }, electric, rooms)
    if (!cable || !polyline) return
    const roomOf = (pointId: string) => rooms.find(r => r.id === electric.find(p => p.id === pointId)?.roomId)
    const via = autoRoute(polyline[0], polyline[1], runHeight(roomOf(cable.fromId), roomOf(cable.toId)), rooms)
    get().updateCable(id, { via })
  },

  autoConnectPoint: pointId => {
    const planned = planAutoConnections(get(), [pointId])
    for (const wire of planned) {
      const id = get().addCable(wire.fromId, wire.toId, wire.type)
      if (id) get().updateCable(id, { circuit: wire.circuit })
    }
    const touched = get().cables.filter(c => c.fromId === pointId || c.toId === pointId)
    touched.forEach(c => get().rerouteCable(c.id))
    return { added: planned.length, rerouted: touched.length }
  },

  autoConnectAndRerouteAll: () => {
    const planned = planAutoConnections(get())
    for (const wire of planned) {
      const id = get().addCable(wire.fromId, wire.toId, wire.type)
      if (id) get().updateCable(id, { circuit: wire.circuit })
    }
    const all = get().cables
    all.forEach(c => get().rerouteCable(c.id))
    return { added: planned.length, rerouted: all.length }
  },

  insertWaypoint: (cableId, index, waypoint) =>
    set(s => ({
      cables: s.cables.map(c => (c.id === cableId ? { ...c, via: [...c.via.slice(0, index), waypoint, ...c.via.slice(index)] } : c)),
    })),

  updateWaypoint: (cableId, index, patch) =>
    set(s => ({
      cables: s.cables.map(c => (c.id === cableId ? { ...c, via: c.via.map((w, i) => (i === index ? { ...w, ...patch } : w)) } : c)),
    })),

  deleteWaypoint: (cableId, index) =>
    set(s => ({ cables: s.cables.map(c => (c.id === cableId ? { ...c, via: c.via.filter((_, i) => i !== index) } : c)) })),
}))

/** Vybere z celého stavu jen ukládaná data. */
export const selectProject = ({ rooms, obstacles, furniture, electric, cables }: ProjectState): Project =>
  ({ rooms, obstacles, furniture, electric, cables })

/** Změnila se ukládaná data (a ne jen třeba akce ve store)? */
export const projectChanged = (a: Project, b: Project) =>
  a.rooms !== b.rooms || a.obstacles !== b.obstacles || a.furniture !== b.furniture ||
  a.electric !== b.electric || a.cables !== b.cables
