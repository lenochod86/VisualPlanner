// Elektro: poloha bodů, trasy kabelů, jejich automatické trasování a délka.
import { BOARD_DEFAULT_SIZE, ELECTRIC_KINDS } from '../domain/electricCatalog'
import type { Cable, ElectricPoint, Pt, Room, Waypoint } from '../domain/types'
import { ceilingLevel } from './ceiling'
import { clamp, snap } from './math'
import { frontRotation, nearestEdge, roomAt } from './placement'
import { containsPoint, edgeInfo } from './polygon'

/** Bod v prostoru: x, y v půdorysu, z = výška nad podlahou (cm). */
export type Pos3 = Waypoint

export interface ElectricPosition extends Pos3 {
  /** Natočení (rad): u nástěnných bodů lokální osa +y míří do místnosti. */
  rot: number
}

/** O kolik cm od rohu místnosti musí nástěnný bod stát. */
const CORNER_MARGIN = 5
/** Svislá trasa u vedení pod stropem: kolik cm pod stropem se vede (u SDK nad deskou, v podhledu). */
const RUN_BELOW_SLAB = 30
const RUN_ABOVE_SDK_BOARD = 3

/** Rozměry rozvaděče (šířka × výška × hloubka, cm); chybějící hodnoty se doplní výchozími. */
export function boardSize(point: Pick<ElectricPoint, 'w' | 'h' | 'd'>): { w: number; h: number; d: number } {
  return { w: point.w ?? BOARD_DEFAULT_SIZE.w, h: point.h ?? BOARD_DEFAULT_SIZE.h, d: point.d ?? BOARD_DEFAULT_SIZE.d }
}

/** Jak daleko od konce zdi musí nástěnný bod stát (rozvaděč tak, aby se celý vešel). */
export function wallMargin(point: ElectricPoint): number {
  return point.kind === 'board' ? Math.max(CORNER_MARGIN, boardSize(point).w / 2) : CORNER_MARGIN
}

/**
 * Poloha bodu pro kabely a měření: x, y v půdorysu a z. U zásuvek a vypínačů je z jejich střed (zadaná výška),
 * u rozvaděče jeho HORNÍ hrana (zadaná výška je spodní hrana + výška skříně) - tam kabely vstupují.
 */
export function electricPosition(point: ElectricPoint, room: Room): ElectricPosition {
  const spec = ELECTRIC_KINDS[point.kind]
  if (spec.mount === 'ceiling') return { x: point.x, y: point.y, z: ceilingLevel(room), rot: 0 }
  const z = point.kind === 'board' ? point.height + boardSize(point).h : point.height
  if (!point.attach || point.attach.edge >= room.pts.length) return { x: point.x, y: point.y, z, rot: 0 }

  const e = edgeInfo(room.pts, point.attach.edge)
  const margin = wallMargin(point)
  const along = clamp(point.attach.along, margin, e.len - margin)
  return { x: e.a.x + e.dir.x * along, y: e.a.y + e.dir.y * along, z, rot: frontRotation(e) }
}

/** Změna bodu při tažení: nástěnné se přichytí ke stěně místnosti pod kurzorem, stropní stojí kde je kurzor. */
export function dragElectricPatch(point: ElectricPoint, rooms: Room[], cursor: Pt): Partial<ElectricPoint> {
  const room = roomAt(rooms, cursor) ?? rooms.find(r => r.id === point.roomId)
  if (!room) return {}
  if (ELECTRIC_KINDS[point.kind].mount === 'ceiling') {
    return { roomId: room.id, x: snap(cursor.x), y: snap(cursor.y) }
  }
  const near = nearestEdge(room.pts, cursor)
  return { roomId: room.id, attach: { edge: near.edge, along: snap(near.along) } }
}

/** Celá trasa kabelu včetně koncových bodů; null, když některý konec chybí. */
export function cablePolyline(cable: Cable, points: ElectricPoint[], rooms: Room[]): Pos3[] | null {
  const position = (id: string) => {
    const point = points.find(p => p.id === id)
    const room = point && rooms.find(r => r.id === point.roomId)
    return point && room ? electricPosition(point, room) : null
  }
  const from = position(cable.fromId), to = position(cable.toId)
  if (!from || !to) return null
  return [from, ...cable.via, to]
}

export function polylineLength(polyline: Pos3[]): number {
  let length = 0
  for (let i = 0; i + 1 < polyline.length; i++) {
    const a = polyline[i], b = polyline[i + 1]
    length += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
  }
  return length
}

/** Výška vedení kabelů pod stropem: u SDK podhledu v dutině nad deskou, jinak 30 cm pod stropem. */
export function runHeight(...rooms: (Room | undefined)[]): number {
  const heights = rooms.filter((r): r is Room => !!r).map(r =>
    r.ceiling.type === 'sdk' ? ceilingLevel(r) + RUN_ABOVE_SDK_BOARD : r.height - RUN_BELOW_SLAB)
  return heights.length ? Math.min(...heights) : 230
}

/**
 * Automatická trasa: z bodu svisle (ve zdi / ze stropu) do výšky vedení, pak vodorovně v pravých úhlech
 * (kolénko volíme tak, aby leželo uvnitř bytu) a svisle dolů ke koncovému bodu.
 */
export function autoRoute(from: Pos3, to: Pos3, runZ: number, rooms: Room[]): Waypoint[] {
  const route: Waypoint[] = [{ x: from.x, y: from.y, z: runZ }]
  if (from.x !== to.x && from.y !== to.y) {
    const inside = (p: Pt) => rooms.some(r => containsPoint(r.pts, p))
    const first = { x: to.x, y: from.y }, second = { x: from.x, y: to.y }
    const elbow = inside(first) || !inside(second) ? first : second
    route.push({ ...elbow, z: runZ })
  }
  route.push({ x: to.x, y: to.y, z: runZ })

  // vynecháme body, které splývají s předchozím nebo s koncem trasy (např. světlo přímo ve výšce vedení)
  const sameAs = (a: Pos3, b: Pos3) => a.x === b.x && a.y === b.y && a.z === b.z
  return route.filter((p, i) => !sameAs(p, i === 0 ? from : route[i - 1]) && !(i === route.length - 1 && sameAs(p, to)))
}
