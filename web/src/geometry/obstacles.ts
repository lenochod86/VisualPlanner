import type { Obstacle, Pt, Room } from '../domain/types'
import { clamp } from './math'
import { edgeInfo } from './polygon'
import type { WallModel } from './walls'

export interface Placement { x: number; y: number; rot: number }

/** Tloušťka zdi, ke které je překážka připnutá (jinak výchozí první stěny). */
export function wallThicknessFor(o: Obstacle, room: Room, walls: WallModel): number {
  return walls.info(room.id, o.attach?.edge ?? 0).thickness
}

/** Skutečná poloha překážky; je-li připnutá ke stěně, počítá se ze stěny (a tak ji sleduje při změně rozměrů). */
export function resolveObstacle(o: Obstacle, room: Room, walls: WallModel): Placement {
  if (!o.attach || o.attach.edge >= room.pts.length) return { x: o.x, y: o.y, rot: o.rot }
  const e = edgeInfo(room.pts, o.attach.edge)
  const along = clamp(o.attach.along, o.w / 2, e.len - o.w / 2)
  const inWall = o.kind === 'window' || o.kind === 'door'
  const wallT = wallThicknessFor(o, room, walls)
  const offset = inWall ? -wallT / 2 : o.d / 2  // do středu zdi vs. těsně u zdi uvnitř
  return {
    x: e.a.x + e.dir.x * along + e.inward.x * offset,
    y: e.a.y + e.dir.y * along + e.inward.y * offset,
    rot: Math.atan2(e.dir.y, e.dir.x),
  }
}

/** Nejbližší stěna k bodu `p` a pozice průmětu bodu podél ní. */
export function nearestEdge(pts: Pt[], p: Pt): { edge: number; dist: number; along: number } {
  let best = { edge: 0, dist: Infinity, along: 0 }
  for (let i = 0; i < pts.length; i++) {
    const e = edgeInfo(pts, i)
    const t = (p.x - e.a.x) * e.dir.x + (p.y - e.a.y) * e.dir.y
    const along = clamp(t, 0, e.len)
    const dist = Math.hypot(p.x - (e.a.x + e.dir.x * along), p.y - (e.a.y + e.dir.y * along))
    if (dist < best.dist) best = { edge: i, dist, along }
  }
  return best
}
