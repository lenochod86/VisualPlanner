// Stropy: výška podhledu a rastr profilů SDK podhledu.
import type { Pt, Room } from '../domain/types'
import { bbox } from './polygon'

/** Tloušťka sádrokartonové desky podhledu. */
export const SDK_BOARD = 1.25
/** Rozměry CD profilu (šířka × výška). */
export const PROFILE_WIDTH = 6
export const PROFILE_HEIGHT = 2.7
/** Vzdálenost prvního profilu od okraje místnosti. */
const FIRST_PROFILE_OFFSET = 30

/** Výška spodní plochy stropu: u SDK podhled pod stropem, jinak strop v úrovni výšky místnosti. */
export const ceilingLevel = (room: Room): number =>
  room.ceiling.type === 'sdk' ? room.height - room.ceiling.drop : room.height

export interface ProfileSegment { a: Pt; b: Pt }

/** Průsečíky přímky (vodorovné y = c, nebo svislé x = c) s polygonem, seřazené, po dvojicích = úseky uvnitř. */
function insideIntervals(pts: Pt[], c: number, horizontal: boolean): [number, number][] {
  const along = horizontal ? 'x' : 'y', across = horizontal ? 'y' : 'x'
  const hits: number[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    if ((a[across] > c) !== (b[across] > c)) {
      hits.push(a[along] + ((c - a[across]) / (b[across] - a[across])) * (b[along] - a[along]))
    }
  }
  hits.sort((p, q) => p - q)
  const intervals: [number, number][] = []
  for (let i = 0; i + 1 < hits.length; i += 2) intervals.push([hits[i], hits[i + 1]])
  return intervals
}

/**
 * Profily SDK podhledu jako úsečky v půdorysu.
 * `main`: nosné profily rovnoběžné s osou x (vodorovné čáry), rozteč `profileSpacing`.
 * `cross`: příčné profily rovnoběžné s osou y, rozteč `crossSpacing`.
 */
export function profileSegments(room: Room): { main: ProfileSegment[]; cross: ProfileSegment[] } {
  const box = bbox(room.pts)
  const lines = (min: number, max: number, spacing: number) => {
    const values: number[] = []
    for (let c = min + FIRST_PROFILE_OFFSET; c <= max - FIRST_PROFILE_OFFSET; c += Math.max(spacing, 10)) values.push(c)
    return values
  }

  const main = lines(box.minY, box.maxY, room.ceiling.profileSpacing).flatMap(y =>
    insideIntervals(room.pts, y, true).map(([x0, x1]) => ({ a: { x: x0, y }, b: { x: x1, y } })))
  const cross = lines(box.minX, box.maxX, room.ceiling.crossSpacing).flatMap(x =>
    insideIntervals(room.pts, x, false).map(([y0, y1]) => ({ a: { x, y: y0 }, b: { x, y: y1 } })))
  return { main, cross }
}
