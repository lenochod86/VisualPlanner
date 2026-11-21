import { DEFAULT_ROOM_HEIGHT, DEFAULT_WALL_THICKNESS } from '../config'
import { shapePts } from '../geometry/shapes'
import type { Project } from './types'

/** Projekt, se kterým aplikace startuje, když ještě nic není uložené. */
export function createInitialProject(): Project {
  return {
    rooms: [{
      id: 'initial-room', name: 'Obývák', type: 'living',
      pts: shapePts('rect', 0, 0, 450, 350),
      wallT: DEFAULT_WALL_THICKNESS, height: DEFAULT_ROOM_HEIGHT,
    }],
    obstacles: [],
  }
}

/** Ověří, že data z importu / serveru vypadají jako projekt. Při chybě vyhodí Error. */
export function parseProject(data: unknown): Project {
  const d = data as Partial<Project> | null
  if (!d || !Array.isArray(d.rooms) || !Array.isArray(d.obstacles)) {
    throw new Error('Soubor neobsahuje platný projekt (chybí rooms/obstacles).')
  }
  const roomsOk = d.rooms.every(r => r && typeof r.id === 'string' && Array.isArray(r.pts) && r.pts.length >= 3)
  if (!roomsOk) throw new Error('Projekt obsahuje neplatnou místnost.')
  return { rooms: d.rooms, obstacles: d.obstacles }
}
