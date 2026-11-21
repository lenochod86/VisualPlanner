// Stav projektu (místnosti, překážky, nábytek) a akce, které ho mění. Žádné UI věci (výběr, nástroj) - ty jsou v uiStore.
import { create } from 'zustand'
import { DEFAULT_ROOM_HEIGHT, DEFAULT_WALL_THICKNESS, MAX_WALL, MIN_WALL } from '../config'
import { OBSTACLE_KINDS, ROOM_TYPES } from '../domain/catalog'
import { FURNITURE_KINDS } from '../domain/furnitureCatalog'
import { createInitialProject } from '../domain/project'
import type {
  Furniture, FurnitureKind, Obstacle, ObstacleKind, Placed, Project, Rect, Room, RoomShape,
} from '../domain/types'
import { magnetizeRoom } from '../geometry/magnet'
import { clamp } from '../geometry/math'
import { rotatePatch } from '../geometry/placement'
import { bbox, edgeInfo, setEdgeLength, translatePts } from '../geometry/polygon'
import { rectPts, shapePts } from '../geometry/shapes'
import { applyWallThickness } from '../geometry/walls'

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

  addObstacle: (kind: ObstacleKind, roomId: string) => string | null
  updateObstacle: (id: string, patch: Partial<Obstacle>) => void
  deleteObstacle: (id: string) => void

  /** Přidá nábytek do místnosti (připnutý uprostřed první stěny). Vrací id. */
  addFurniture: (kind: FurnitureKind, roomId: string) => string | null
  updateFurniture: (id: string, patch: Partial<Furniture>) => void
  /** Otočí o 90°: u nábytku na zdi prohodí šířku a hloubku, volný natočí. */
  rotateFurniture: (id: string) => void
  deleteFurniture: (id: string) => void
}

const newId = () => crypto.randomUUID()

function newRoom(pts: Room['pts']): Room {
  return {
    id: newId(), name: ROOM_TYPES.other.label, type: 'other', pts,
    walls: pts.map(() => DEFAULT_WALL_THICKNESS), height: DEFAULT_ROOM_HEIGHT,
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

  loadProject: project => set({ rooms: project.rooms, obstacles: project.obstacles, furniture: project.furniture }),

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
      return {
        rooms: s.rooms.map(r => (r.id === id ? { ...r, pts: translatePts(r.pts, dx, dy) } : r)),
        obstacles: s.obstacles.map(shift),
        furniture: s.furniture.map(shift),
      }
    }),

  deleteRoom: id =>
    set(s => ({
      rooms: s.rooms.filter(r => r.id !== id),
      obstacles: s.obstacles.filter(o => o.roomId !== id),
      furniture: s.furniture.filter(f => f.roomId !== id),
    })),

  setWallLength: (roomId, edge, length) => {
    const room = get().rooms.find(r => r.id === roomId)
    if (!room || !(length > 0)) return
    get().updateRoom(roomId, { pts: setEdgeLength(room.pts, edge, length) })
  },

  setWallThickness: (roomId, edge, thickness) => {
    const next = applyWallThickness(get().rooms, roomId, edge, clamp(thickness, MIN_WALL, MAX_WALL))
    if (next) set({ rooms: next })
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

  rotateFurniture: id => {
    const item = get().furniture.find(f => f.id === id)
    if (item) get().updateFurniture(id, rotatePatch(item))
  },

  deleteFurniture: id => set(s => ({ furniture: s.furniture.filter(f => f.id !== id) })),
}))

/** Vybere z celého stavu jen ukládaná data. */
export const selectProject = ({ rooms, obstacles, furniture }: ProjectState): Project => ({ rooms, obstacles, furniture })

/** Změnila se ukládaná data (a ne jen třeba akce ve store)? */
export const projectChanged = (a: Project, b: Project) =>
  a.rooms !== b.rooms || a.obstacles !== b.obstacles || a.furniture !== b.furniture
