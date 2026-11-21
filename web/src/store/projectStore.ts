// Stav projektu (místnosti a překážky) a akce, které ho mění. Žádné UI věci (výběr, nástroj) - ty jsou v uiStore.
import { create } from 'zustand'
import { DEFAULT_ROOM_HEIGHT, DEFAULT_WALL_THICKNESS } from '../config'
import { OBSTACLE_KINDS, ROOM_TYPES } from '../domain/catalog'
import { createInitialProject } from '../domain/project'
import type { Obstacle, ObstacleKind, Project, Rect, Room, RoomShape } from '../domain/types'
import { magnetizeRoom } from '../geometry/magnet'
import { bbox, edgeInfo, translatePts } from '../geometry/polygon'
import { rectPts, shapePts } from '../geometry/shapes'

interface ProjectState extends Project {
  loadProject: (project: Project) => void
  /** Přidá místnost vpravo od ostatních (se sdílenou zdí). Vrací id nové místnosti. */
  addRoom: (shape: RoomShape) => string
  /** Přidá obdélníkovou místnost nakreslenou uživatelem a přitáhne ji k sousedům. */
  addRoomFromRect: (rect: Rect) => string
  updateRoom: (id: string, patch: Partial<Room>) => void
  moveRoom: (id: string, dx: number, dy: number) => void
  deleteRoom: (id: string) => void
  addObstacle: (kind: ObstacleKind, roomId: string) => string | null
  updateObstacle: (id: string, patch: Partial<Obstacle>) => void
  deleteObstacle: (id: string) => void
}

const newId = () => crypto.randomUUID()

function newRoom(pts: Room['pts']): Room {
  return {
    id: newId(), name: ROOM_TYPES.other.label, type: 'other', pts,
    wallT: DEFAULT_WALL_THICKNESS, height: DEFAULT_ROOM_HEIGHT,
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

export const useProjectStore = create<ProjectState>()((set, get) => ({
  ...createInitialProject(),

  loadProject: project => set({ rooms: project.rooms, obstacles: project.obstacles }),

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
    set(s => ({
      rooms: s.rooms.map(r => (r.id === id ? { ...r, pts: translatePts(r.pts, dx, dy) } : r)),
      // volně stojící překážky se posunou s místností; připnuté se přepočítají ze stěny samy
      obstacles: s.obstacles.map(o => (o.roomId === id ? { ...o, x: o.x + dx, y: o.y + dy } : o)),
    })),

  deleteRoom: id =>
    set(s => ({
      rooms: s.rooms.filter(r => r.id !== id),
      obstacles: s.obstacles.filter(o => o.roomId !== id),
    })),

  addObstacle: (kind, roomId) => {
    const room = get().rooms.find(r => r.id === roomId)
    if (!room) return null
    const spec = OBSTACLE_KINDS[kind]
    const box = bbox(room.pts)
    const obstacle: Obstacle = {
      id: newId(), roomId, kind,
      w: spec.w, d: spec.d, h: spec.h, elev: spec.elev,
      x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2, rot: 0,
      // nová překážka se rovnou připne uprostřed první stěny
      attach: { edge: 0, along: edgeInfo(room.pts, 0).len / 2 },
    }
    set(s => ({ obstacles: [...s.obstacles, obstacle] }))
    return obstacle.id
  },

  updateObstacle: (id, patch) =>
    set(s => ({ obstacles: s.obstacles.map(o => (o.id === id ? { ...o, ...patch } : o)) })),

  deleteObstacle: id => set(s => ({ obstacles: s.obstacles.filter(o => o.id !== id) })),
}))

/** Vybere z celého stavu jen ukládaná data. */
export const selectProject = ({ rooms, obstacles }: ProjectState): Project => ({ rooms, obstacles })
