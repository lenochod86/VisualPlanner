// Otvory ve zdech: okna a dveře. Pro každý z nich vznikne obdélník v půdorysu (přes celou tloušťku zdi)
// a rozsah výšek, ve kterém se z zdi odřízne.
import { OBSTACLE_KINDS } from '../domain/catalog'
import type { Obstacle, Pt, Room } from '../domain/types'
import { clamp } from './math'
import { resolvePlacement, wallThicknessFor } from './placement'
import type { WallModel } from './walls'

/** O kolik řez přesahuje zeď na každé straně, aby se plochy neshodovaly se stěnami (jinak artefakty). */
const CUT_MARGIN = 2

export interface Opening {
  roomId: string
  /** Čtyři rohy řezu v půdorysu. */
  corners: Pt[]
  /** Od jaké a do jaké výšky se zeď odřízne (cm nad podlahou). */
  z0: number
  z1: number
}

export function buildOpenings(rooms: Room[], obstacles: Obstacle[], walls: WallModel): Opening[] {
  const openings: Opening[] = []
  for (const o of obstacles) {
    if (!OBSTACLE_KINDS[o.kind].inWall || !o.attach) continue
    const room = rooms.find(r => r.id === o.roomId)
    if (!room || o.attach.edge >= room.pts.length) continue

    const p = resolvePlacement(o, room, walls, true)
    const halfDepth = wallThicknessFor(o, room, walls) / 2 + CUT_MARGIN
    const u = { x: Math.cos(p.rot), y: Math.sin(p.rot) }    // podél zdi
    const v = { x: -Math.sin(p.rot), y: Math.cos(p.rot) }   // napříč zdí
    const corners = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([a, b]) => ({
      x: p.x + u.x * a * o.w / 2 + v.x * b * halfDepth,
      y: p.y + u.y * a * o.w / 2 + v.y * b * halfDepth,
    }))
    openings.push({
      roomId: room.id, corners,
      z0: clamp(o.elev, 0, room.height), z1: clamp(o.elev + o.h, 0, room.height),
    })
  }
  return openings
}
