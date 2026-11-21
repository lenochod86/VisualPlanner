import type { Pt, Rect, RoomShape } from '../domain/types'

/**
 * Vrcholy základního tvaru. Pro L je výřez 40 % šířky a hloubky
 * v pravém ("L-right") nebo levém ("L-left") horním rohu.
 */
export function shapePts(shape: RoomShape, x: number, y: number, w: number, d: number): Pt[] {
  const nw = Math.round(w * 0.4 / 5) * 5
  const nd = Math.round(d * 0.4 / 5) * 5
  const raw: [number, number][] =
    shape === 'rect' ? [[0, 0], [w, 0], [w, d], [0, d]]
    : shape === 'L-right' ? [[0, 0], [w - nw, 0], [w - nw, nd], [w, nd], [w, d], [0, d]]
    : [[nw, 0], [w, 0], [w, d], [0, d], [0, nd], [nw, nd]]
  return raw.map(([px, py]) => ({ x: x + px, y: y + py }))
}

export function rectPts(r: Rect): Pt[] {
  return shapePts('rect', r.x, r.y, r.w, r.h)
}

/** Obdélník mezi dvěma libovolnými rohy (v libovolném pořadí). */
export function rectFromCorners(a: Pt, b: Pt): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
}
