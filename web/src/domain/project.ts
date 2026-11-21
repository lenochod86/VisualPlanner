import { DEFAULT_ROOM_HEIGHT, DEFAULT_WALL_THICKNESS } from '../config'
import { shapePts } from '../geometry/shapes'
import { DEFAULT_CEILING, DEFAULT_WALL_MATERIAL } from './materials'
import type { Project, Room } from './types'

/** Projekt, se kterým aplikace startuje, když ještě nic není uložené. */
export function createInitialProject(): Project {
  const pts = shapePts('rect', 0, 0, 450, 350)
  return {
    rooms: [{
      id: 'initial-room', name: 'Obývák', type: 'living', pts,
      walls: pts.map(() => DEFAULT_WALL_THICKNESS), height: DEFAULT_ROOM_HEIGHT,
      wallMaterial: DEFAULT_WALL_MATERIAL, ceiling: { ...DEFAULT_CEILING },
    }],
    obstacles: [],
    furniture: [],
  }
}

/** Starší uložení mělo jednu tloušťku `wallT` na místnost; nově je tloušťka u každé stěny. */
function normalizeRoom(raw: Room & { wallT?: number }): Room {
  const { wallT, ...room } = raw
  const fallback = wallT ?? DEFAULT_WALL_THICKNESS
  const walls = room.pts.map((_, i) => (Array.isArray(room.walls) && room.walls[i] > 0 ? room.walls[i] : fallback))
  // materiál a strop starší projekty nemají
  return { ...room, walls, wallMaterial: room.wallMaterial ?? DEFAULT_WALL_MATERIAL, ceiling: { ...DEFAULT_CEILING, ...room.ceiling } }
}

/** Ověří, že data z importu / serveru vypadají jako projekt. Při chybě vyhodí Error. */
export function parseProject(data: unknown): Project {
  const d = data as Partial<Project> | null
  if (!d || !Array.isArray(d.rooms) || !Array.isArray(d.obstacles)) {
    throw new Error('Soubor neobsahuje platný projekt (chybí rooms/obstacles).')
  }
  const roomsOk = d.rooms.every(r => r && typeof r.id === 'string' && Array.isArray(r.pts) && r.pts.length >= 3)
  if (!roomsOk) throw new Error('Projekt obsahuje neplatnou místnost.')
  // `furniture` starší projekty nemají
  return { rooms: d.rooms.map(normalizeRoom), obstacles: d.obstacles, furniture: Array.isArray(d.furniture) ? d.furniture : [] }
}
