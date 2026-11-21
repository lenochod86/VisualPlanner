// Magnetické přichytávání místností k sousedům: dvě místnosti se přitáhnou tak,
// aby mezi nimi zbyla právě jedna sdílená zeď (mezera = tloušťka zdi),
// nebo aby lícovaly stěny stejným směrem (např. souvislá stěna chodby).
import { MAGNET_DISTANCE } from '../config'
import type { Pt } from '../domain/types'
import { edgeInfo, moveEdge, type EdgeInfo } from './polygon'

/** O kolik by se musela stěna `edge` posunout (kolmo na sebe), aby zlícovala se stěnou jiné místnosti. */
function shiftCandidates(edge: EdgeInfo, others: Pt[][], gap: number): number[] {
  const axis = edge.horizontal ? 'y' : 'x'
  const own = edge.a[axis]
  const facing = Math.sign(edge.outward[axis])
  const shifts: number[] = []
  for (const pts of others) {
    for (let i = 0; i < pts.length; i++) {
      const other = edgeInfo(pts, i)
      if (other.horizontal !== edge.horizontal) continue
      const target = other.a[axis]
      const sameFacing = Math.sign(other.outward[axis]) === facing
      // proti sobě: mezi stěnami zůstane `gap` (sdílená zeď); stejným směrem: stěny lícují
      shifts.push(sameFacing ? target - own : target - own - facing * gap)
    }
  }
  return shifts
}

/** Nejmenší posun v dosahu magnetu, jinak 0. */
function nearestShift(shifts: number[]): number {
  let best = 0, bestAbs = Infinity
  for (const s of shifts) {
    if (Math.abs(s) <= MAGNET_DISTANCE && Math.abs(s) < bestAbs) { best = s; bestAbs = Math.abs(s) }
  }
  return best
}

/** Souřadnice, na kterou se má stěna `i` posunout, když ji uživatel táhne na `coord`. */
export function magnetEdgeCoord(pts: Pt[], i: number, coord: number, others: Pt[][], gap: number): number {
  const moved = moveEdge(pts, i, coord)
  if (moved === pts) return coord
  return coord + nearestShift(shiftCandidates(edgeInfo(moved, i), others, gap))
}

/** Dodatečný posun celé místnosti (už přesunuté na místo kurzoru), aby se přilepila k sousedům. */
export function magnetRoomShift(pts: Pt[], others: Pt[][], gap: number): Pt {
  const xs: number[] = [], ys: number[] = []
  for (let i = 0; i < pts.length; i++) {
    const e = edgeInfo(pts, i)
    ;(e.horizontal ? ys : xs).push(...shiftCandidates(e, others, gap))
  }
  return { x: nearestShift(xs), y: nearestShift(ys) }
}

/** Přitáhne postupně všechny stěny nového tvaru k sousedům (např. po nakreslení místnosti). */
export function magnetizeRoom(pts: Pt[], others: Pt[][], gap: number): Pt[] {
  let result = pts
  for (let i = 0; i < result.length; i++) {
    const e = edgeInfo(result, i)
    const coord = e.horizontal ? e.a.y : e.a.x
    result = moveEdge(result, i, magnetEdgeCoord(result, i, coord, others, gap))
  }
  return result
}
