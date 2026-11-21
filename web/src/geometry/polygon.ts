import { MIN_EDGE } from '../config'
import type { Pt } from '../domain/types'

export function signedArea(pts: Pt[]): number {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    s += a.x * b.y - b.x * a.y
  }
  return s / 2
}

export const polygonArea = (pts: Pt[]) => Math.abs(signedArea(pts))

export function bbox(pts: Pt[]) {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

/** Těžiště polygonu (pro umístění popisku; u tvaru L leží uvnitř tvaru). */
export function centroid(pts: Pt[]): Pt {
  const a = signedArea(pts)
  if (Math.abs(a) < 1e-6) {
    const b = bbox(pts)
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
  }
  let cx = 0, cy = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length]
    const cross = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  }
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

export const translatePts = (pts: Pt[], dx: number, dy: number): Pt[] =>
  pts.map(p => ({ x: p.x + dx, y: p.y + dy }))

export interface EdgeInfo {
  a: Pt; b: Pt
  len: number
  dir: Pt        // jednotkový směr a -> b
  inward: Pt     // normála do místnosti
  outward: Pt    // normála ven (tam se kreslí zeď)
  horizontal: boolean
}

export function edgeInfo(pts: Pt[], i: number): EdgeInfo {
  const a = pts[i], b = pts[(i + 1) % pts.length]
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const dir = { x: dx / len, y: dy / len }
  const outward = signedArea(pts) > 0 ? { x: dir.y, y: -dir.x } : { x: -dir.y, y: dir.x }
  return { a, b, len, dir, outward, inward: { x: -outward.x, y: -outward.y }, horizontal: Math.abs(dy) < 1e-6 }
}

const hasValidEdges = (pts: Pt[]) => pts.every((_, i) => edgeInfo(pts, i).len >= MIN_EDGE)

/**
 * Posune stěnu `i` kolmo na sebe tak, aby ležela na souřadnici `coord`
 * (y pro vodorovnou stěnu, x pro svislou). Když by některá stěna zkrátila pod
 * minimum, vrátí původní pole (stejnou referenci).
 */
export function moveEdge(pts: Pt[], i: number, coord: number): Pt[] {
  const j = (i + 1) % pts.length
  const horizontal = edgeInfo(pts, i).horizontal
  const next = pts.map((p, k) =>
    k === i || k === j ? (horizontal ? { ...p, y: coord } : { ...p, x: coord }) : p)
  return hasValidEdges(next) ? next : pts
}

/** Nastaví délku stěny `i`; navazující stěna se posune. Při neplatném výsledku vrátí původní pole. */
export function setEdgeLength(pts: Pt[], i: number, length: number): Pt[] {
  const e = edgeInfo(pts, i)
  const delta = length - e.len
  const j = (i + 1) % pts.length, k = (i + 2) % pts.length
  const next = pts.map((p, n) =>
    n === j || n === k ? { x: p.x + e.dir.x * delta, y: p.y + e.dir.y * delta } : p)
  return hasValidEdges(next) ? next : pts
}

/** Leží bod uvnitř polygonu? (paprsek doprava, sudý/lichý počet průsečíků) */
export function containsPoint(pts: Pt[], p: Pt): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
