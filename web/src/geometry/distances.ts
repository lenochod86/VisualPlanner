// Vzdálenosti elektro bodů od okolí: u zásuvky/vypínače podél zdi k rohům a k sousedním prvkům na téže zdi
// (nábytek, dveře, okna, jiné body), u stropního světla k okolním zdem. Slouží ke kótám v záložce Elektro.
import { attachExtents } from './placement'
import { clamp } from './math'
import { ELECTRIC_KINDS } from '../domain/electricCatalog'
import type { Furniture, Obstacle, ElectricPoint, Pt, Room } from '../domain/types'
import { boardSize, electricPosition, wallMargin } from './electric'
import { edgeInfo } from './polygon'

/** Měřená úsečka v půdorysu a její délka v cm. */
export interface DimLine { a: Pt; b: Pt; length: number }

/** Jak daleko od zdi do místnosti se kóta kreslí (cm), aby nesplývala se stěnou. */
const DIM_OFFSET = 14
/** Poloviční šířka značky zásuvky/vypínače při měření (cm). */
const POINT_HALF_WIDTH = 4

interface Surroundings {
  rooms: Room[]
  obstacles: Obstacle[]
  furniture: Furniture[]
  electric: ElectricPoint[]
}

const line = (a: Pt, b: Pt): DimLine => ({ a, b, length: Math.hypot(b.x - a.x, b.y - a.y) })

/** Vzdálenost od `origin` ve směru osy (dx, dy) k nejbližší stěně místnosti, nebo null. */
function rayToWall(pts: Pt[], origin: Pt, dx: number, dy: number): Pt | null {
  let best: Pt | null = null, bestDist = Infinity
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    if (dx !== 0) {                                   // vodorovný paprsek protíná svislé stěny
      if (a.x !== b.x || (a.y > origin.y) === (b.y > origin.y)) continue
      const dist = (a.x - origin.x) * dx
      if (dist > 0.5 && dist < bestDist) { bestDist = dist; best = { x: a.x, y: origin.y } }
    } else {                                          // svislý paprsek protíná vodorovné stěny
      if (a.y !== b.y || (a.x > origin.x) === (b.x > origin.x)) continue
      const dist = (a.y - origin.y) * dy
      if (dist > 0.5 && dist < bestDist) { bestDist = dist; best = { x: origin.x, y: a.y } }
    }
  }
  return best
}

export function electricDistances(point: ElectricPoint, around: Surroundings): DimLine[] {
  const room = around.rooms.find(r => r.id === point.roomId)
  if (!room) return []
  const here = electricPosition(point, room)

  // stropní bod (světlo): vzdálenosti ke čtyřem okolním zdem
  if (ELECTRIC_KINDS[point.kind].mount === 'ceiling' || !point.attach) {
    return ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).flatMap(([dx, dy]) => {
      const hit = rayToWall(room.pts, here, dx, dy)
      return hit ? [line(here, hit)] : []
    })
  }

  // nástěnný bod: poloha podél zdi a okraje všeho, co na téže zdi stojí
  const edge = point.attach.edge
  const e = edgeInfo(room.pts, edge)
  const margin = wallMargin(point)
  const s = clamp(point.attach.along, margin, e.len - margin)
  const stops = [0, e.len]
  const addRange = (center: number, extent: number) => {
    const c = clamp(center, extent / 2, e.len - extent / 2)
    stops.push(c - extent / 2, c + extent / 2)
  }
  for (const f of around.furniture) {
    if (f.roomId === room.id && f.attach?.edge === edge) addRange(f.attach.along, attachExtents(f, f.attach.turn).along)
  }
  for (const o of around.obstacles) {
    if (o.roomId === room.id && o.attach?.edge === edge) addRange(o.attach.along, o.w)
  }
  for (const p of around.electric) {
    if (p.id !== point.id && p.roomId === room.id && p.attach?.edge === edge) addRange(p.attach.along, p.kind === 'board' ? boardSize(p).w : 2 * POINT_HALF_WIDTH)
  }

  // nejbližší okraj vlevo a vpravo; kóty se kreslí kousek od zdi uvnitř místnosti
  const left = Math.max(...stops.filter(t => t < s - 0.5))
  const right = Math.min(...stops.filter(t => t > s + 0.5))
  const at = (t: number): Pt => ({
    x: e.a.x + e.dir.x * t + e.inward.x * DIM_OFFSET,
    y: e.a.y + e.dir.y * t + e.inward.y * DIM_OFFSET,
  })
  const lines: DimLine[] = []
  if (Number.isFinite(left)) lines.push(line(at(left), at(s)))
  if (Number.isFinite(right)) lines.push(line(at(s), at(right)))
  return lines.filter(l => l.length >= 1)
}
