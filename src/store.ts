import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ObsKind, Obstacle, Pt, Room, RoomShape, RoomType, Selection } from './types'
import { OBS_KINDS, ROOM_TYPES } from './constants'
import { bbox, edgeInfo, shapePts } from './geometry'

const uid = () => crypto.randomUUID()

interface State {
  rooms: Room[]
  obstacles: Obstacle[]
  selection: Selection
  wallOpacity: number
  select: (s: Selection) => void
  setWallOpacity: (v: number) => void
  addRoom: (shape: RoomShape) => void
  updateRoom: (id: string, patch: Partial<Room>) => void
  moveRoom: (id: string, dx: number, dy: number) => void
  deleteRoom: (id: string) => void
  addObstacle: (kind: ObsKind, roomId: string) => void
  updateObstacle: (id: string, patch: Partial<Obstacle>) => void
  deleteObstacle: (id: string) => void
}

export const useStore = create<State>()(persist((set, get) => ({
  rooms: [{ id: 'r1', name: 'Obývák', type: 'living', pts: shapePts('rect', 0, 0, 450, 350), wallT: 10, height: 260 }],
  obstacles: [],
  selection: null,
  wallOpacity: 1,
  select: selection => set({ selection }),
  setWallOpacity: wallOpacity => set({ wallOpacity }),

  addRoom: shape => {
    const rooms = get().rooms
    const maxX = rooms.length ? Math.max(...rooms.map(r => bbox(r.pts).maxX)) : -60
    const type: RoomType = 'other'
    const room: Room = { id: uid(), name: ROOM_TYPES[type].label, type, pts: shapePts(shape, maxX + 60, 0, 400, 300), wallT: 10, height: 260 }
    set({ rooms: [...rooms, room], selection: { type: 'room', id: room.id } })
  },
  updateRoom: (id, patch) => set(s => ({ rooms: s.rooms.map(r => r.id === id ? { ...r, ...patch } : r) })),
  moveRoom: (id, dx, dy) => set(s => ({
    rooms: s.rooms.map(r => r.id === id ? { ...r, pts: r.pts.map((p: Pt) => ({ x: p.x + dx, y: p.y + dy })) } : r),
    obstacles: s.obstacles.map(o => o.roomId === id ? { ...o, x: o.x + dx, y: o.y + dy } : o),
  })),
  deleteRoom: id => set(s => ({
    rooms: s.rooms.filter(r => r.id !== id),
    obstacles: s.obstacles.filter(o => o.roomId !== id),
    selection: null,
  })),

  addObstacle: (kind, roomId) => {
    const room = get().rooms.find(r => r.id === roomId)
    if (!room) return
    const k = OBS_KINDS[kind]
    const b = bbox(room.pts)
    const o: Obstacle = {
      id: uid(), roomId, kind, w: k.w, d: k.d, h: k.h, elev: k.elev, rot: 0,
      x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2,
      // nová překážka se rovnou přichytí k první stěně
      attach: { edge: 0, along: edgeInfo(room.pts, 0).len / 2 },
    }
    set(s => ({ obstacles: [...s.obstacles, o], selection: { type: 'obs', id: o.id } }))
  },
  updateObstacle: (id, patch) => set(s => ({ obstacles: s.obstacles.map(o => o.id === id ? { ...o, ...patch } : o) })),
  deleteObstacle: id => set(s => ({ obstacles: s.obstacles.filter(o => o.id !== id), selection: null })),
}), { name: 'visual-planner-v1' }))
