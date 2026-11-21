// Soupis SDK podhledů: plocha desek a metráž profilů (CD nosné a příčné, UD obvodové) po místnostech a celkem.
// Čisté funkce nad projektem (žádné UI), aby šly testovat a vytisknout.
import { CABLE_RESERVE } from '../config'
import type { Project } from '../domain/types'
import { profileSegments } from '../geometry/ceiling'
import { edgeInfo, polygonArea } from '../geometry/polygon'

/** Délka jednoho kusu profilu (cm); standardně 3 m. */
export const PROFILE_PIECE_LENGTH = 300

export interface CeilingRoomRow {
  room: string
  areaM2: number
  /** Nosné CD profily (rovnoběžné s osou x) a příčné CD profily, v metrech. */
  mainM: number
  crossM: number
  /** Obvodové UD profily po obvodu místnosti, v metrech. */
  perimeterM: number
}

export interface CeilingReport {
  rooms: CeilingRoomRow[]
  totals: {
    areaM2: number
    /** CD profily celkem (nosné + příčné) a kolik kusů po 3 m koupit (s rezervou, nahoru). */
    cdM: number
    cdPieces: number
    /** UD profily celkem a kolik kusů po 3 m koupit. */
    udM: number
    udPieces: number
  }
}

const length = (segments: { a: { x: number; y: number }; b: { x: number; y: number } }[]) =>
  segments.reduce((sum, s) => sum + Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y), 0) / 100
const pieces = (meters: number) => Math.ceil((meters * 100 * CABLE_RESERVE) / PROFILE_PIECE_LENGTH)

/** Soupis podhledů místností s SDK podhledem; ostatní místnosti se nepočítají. */
export function buildCeilingReport(project: Pick<Project, 'rooms'>): CeilingReport {
  const rows: CeilingRoomRow[] = project.rooms.filter(r => r.ceiling.type === 'sdk').map(room => {
    const { main, cross } = profileSegments(room)
    const perimeter = room.pts.reduce((sum, _, i) => sum + edgeInfo(room.pts, i).len, 0) / 100
    return { room: room.name, areaM2: polygonArea(room.pts) / 10000, mainM: length(main), crossM: length(cross), perimeterM: perimeter }
  })
  const sum = (pick: (r: CeilingRoomRow) => number) => rows.reduce((total, r) => total + pick(r), 0)
  const cdM = sum(r => r.mainM + r.crossM), udM = sum(r => r.perimeterM)
  return { rooms: rows, totals: { areaM2: sum(r => r.areaM2), cdM, cdPieces: pieces(cdM), udM, udPieces: pieces(udM) } }
}
