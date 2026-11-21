import type { Obstacle, Pt, Room, RoomShape } from './types'
import { MIN_EDGE } from './constants'

export const snap = (v: number, step = 5) => Math.round(v / step) * step
export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))

/** Vrcholy tvaru; L: výřez nw×nd v pravém/levém horním rohu. */
export function shapePts(shape: RoomShape, x: number, y: number, w: number, d: number): Pt[] {
  const nw = Math.round(w * 0.4 / 5) * 5, nd = Math.round(d * 0.4 / 5) * 5
  const raw: [number, number][] =
    shape === 'rect' ? [[0, 0], [w, 0], [w, d], [0, d]]
    : shape === 'L-right' ? [[0, 0], [w - nw, 0], [w - nw, nd], [w, nd], [w, d], [0, d]]
    : [[nw, 0], [w, 0], [w, d], [0, d], [0, nd], [nw, nd]]
  return raw.map(([px, py]) => ({ x: x + px, y: y + py }))
}

export function signedArea(pts: Pt[]): number {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    s += a.x * b.y - b.x * a.y
  }
  return s / 2
}

export interface EdgeInfo { a: Pt; b: Pt; len: number; dir: Pt; inward: Pt; outward: Pt; horizontal: boolean }

export function edgeInfo(pts: Pt[], i: number): EdgeInfo {
  const a = pts[i], b = pts[(i + 1) % pts.length]
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const dir = { x: dx / len, y: dy / len }
  const out = signedArea(pts) > 0 ? { x: dir.y, y: -dir.x } : { x: -dir.y, y: dir.x }
  return { a, b, len, dir, outward: out, inward: { x: -out.x, y: -out.y }, horizontal: Math.abs(dy) < 1e-6 }
}

const valid = (pts: Pt[]) =>
  pts.every((_, i) => edgeInfo(pts, i).len >= MIN_EDGE)

/** Posune stěnu i kolmo na sebe na souřadnici `coord` (y pro vodorovnou, x pro svislou). */
export function moveEdge(pts: Pt[], i: number, coord: number): Pt[] {
  const j = (i + 1) % pts.length
  const horiz = edgeInfo(pts, i).horizontal
  const next = pts.map((p, k) => (k === i || k === j) ? (horiz ? { ...p, y: coord } : { ...p, x: coord }) : p)
  return valid(next) ? next : pts
}

/** Nastaví délku stěny i (posune navazující stěnu). */
export function setEdgeLength(pts: Pt[], i: number, L: number): Pt[] {
  const e = edgeInfo(pts, i)
  const delta = L - e.len
  const j = (i + 1) % pts.length, k = (i + 2) % pts.length
  const next = pts.map((p, n) => (n === j || n === k) ? { x: p.x + e.dir.x * delta, y: p.y + e.dir.y * delta } : p)
  return valid(next) ? next : pts
}

export function bbox(pts: Pt[]) {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

/** Skutečná poloha překážky (pokud je připnutá ke stěně, počítá se z ní). */
export function resolveObs(o: Obstacle, room: Room): { x: number; y: number; rot: number } {
  if (!o.attach || o.attach.edge >= room.pts.length) return { x: o.x, y: o.y, rot: o.rot }
  const e = edgeInfo(room.pts, o.attach.edge)
  const along = clamp(o.attach.along, o.w / 2, e.len - o.w / 2)
  const off = (o.kind === 'window' || o.kind === 'door') ? -room.wallT / 2 : o.d / 2
  return {
    x: e.a.x + e.dir.x * along + e.inward.x * off,
    y: e.a.y + e.dir.y * along + e.inward.y * off,
    rot: Math.atan2(e.dir.y, e.dir.x),
  }
}

/** Nejbližší stěna k bodu p. */
export function nearestEdge(pts: Pt[], p: Pt): { edge: number; dist: number; along: number } {
  let best = { edge: 0, dist: Infinity, along: 0 }
  for (let i = 0; i < pts.length; i++) {
    const e = edgeInfo(pts, i)
    const t = (p.x - e.a.x) * e.dir.x + (p.y - e.a.y) * e.dir.y
    const tc = Math.min(Math.max(t, 0), e.len)
    const dist = Math.hypot(p.x - (e.a.x + e.dir.x * tc), p.y - (e.a.y + e.dir.y * tc))
    if (dist < best.dist) best = { edge: i, dist, along: tc }
  }
  return best
}
