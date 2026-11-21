// Poloha věcí v místnosti (překážky i nábytek): výpočet skutečné polohy, přichytávání ke zdi a tažení.
//
// Věc u zdi je popsaná připnutím { edge, along, turn }: `turn` je počet čtvrtotáček (0-3) oproti základní
// poloze "zády ke zdi". Při liché čtvrtotáčce stojí věc bokem ke zdi: podél zdi se táhne její hloubka
// a od zdi její šířka. Tak jde postel otočit o 90° a pořád zůstat u zdi.
import { FURNITURE_WALL_SNAP, MIN_OBSTACLE_WIDTH, OBSTACLE_WALL_SNAP } from '../config'
import type { Placed, Pt, Room } from '../domain/types'
import { clamp, snap } from './math'
import { containsPoint, edgeInfo, polygonArea, type EdgeInfo } from './polygon'
import type { WallModel } from './walls'

export interface Placement { x: number; y: number; rot: number }

const QUARTER = Math.PI / 2
/** Do kolika stupňů od čtvrtotáčky se ještě natočení pokládá za "rovnoběžné se zdí" (přichytí se). */
const ALIGN_TOLERANCE_DEG = 12

/** Tloušťka zdi, ke které je věc připnutá (jinak první stěny). */
export function wallThicknessFor(item: Placed, room: Room, walls: WallModel): number {
  return walls.info(room.id, item.attach?.edge ?? 0).thickness
}

/** Rozměr věci podél zdi a kolmo na zeď při `turn` čtvrtotáčkách. */
export function attachExtents(item: Placed, turn = 0): { along: number; perp: number } {
  const sideways = turn % 2 !== 0
  return { along: sideways ? item.d : item.w, perp: sideways ? item.w : item.d }
}

/** Úhel převedený do rozsahu (-π, π]. */
const normalizeAngle = (a: number) => {
  const r = ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
  return r === -Math.PI ? Math.PI : r
}

/**
 * Skutečná poloha věci. Je-li připnutá ke stěně, počítá se ze stěny (a tak ji sleduje při změně rozměrů).
 * Lokální osa "dopředu" (+y, od zdi) míří do místnosti, u věci otočené o čtvrtotáčky se o ně pootočí.
 * `inWall` = věc leží uprostřed zdi (okno, dveře).
 */
export function resolvePlacement(item: Placed, room: Room, walls: WallModel, inWall = false): Placement {
  if (!item.attach || item.attach.edge >= room.pts.length) return { x: item.x, y: item.y, rot: item.rot }
  const e = edgeInfo(room.pts, item.attach.edge)
  const turn = item.attach.turn ?? 0
  const { along: alongExtent, perp } = attachExtents(item, turn)
  const along = clamp(item.attach.along, alongExtent / 2, e.len - alongExtent / 2)
  const offset = inWall ? -wallThicknessFor(item, room, walls) / 2 : perp / 2
  return {
    x: e.a.x + e.dir.x * along + e.inward.x * offset,
    y: e.a.y + e.dir.y * along + e.inward.y * offset,
    rot: frontRotation(e) + turn * QUARTER,
  }
}

/**
 * Natočení věci u stěny tak, aby lokální osa "dopředu" (+y) mířila do místnosti.
 * U opačně orientovaných polygonů by mířila ven, proto se otočí o 180°.
 */
export function frontRotation(e: EdgeInfo): number {
  const rot = Math.atan2(e.dir.y, e.dir.x)
  const frontFacesRoom = e.dir.x * e.inward.y - e.dir.y * e.inward.x > 0
  return frontFacesRoom ? rot : rot + Math.PI
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

/**
 * Místnost, ve které leží bod (vnitřek, bez zdí). Leží-li bod v několika místnostech (kuchyňský kout uvnitř
 * obýváku), vrátí nejvnitřnější, tedy tu s nejmenší plochou, aby šlo věci přichytávat i ke stěnám kouta.
 */
export function roomAt(rooms: Room[], p: Pt): Room | undefined {
  let best: Room | undefined
  let bestArea = Infinity
  for (const room of rooms) {
    if (!containsPoint(room.pts, p)) continue
    const area = polygonArea(room.pts)
    if (area < bestArea) { best = room; bestArea = area }
  }
  return best
}

/** Změna překážky při tažení kurzorem: okna/dveře jsou vždy na zdi, ostatní se ke zdi přichytí z blízka. */
export function dragObstaclePatch(room: Room, cursor: Pt, inWall: boolean): Partial<Placed> {
  const near = nearestEdge(room.pts, cursor)
  if (inWall || near.dist < OBSTACLE_WALL_SNAP) {
    return { attach: { edge: near.edge, along: snap(near.along) } }
  }
  return { attach: undefined, x: snap(cursor.x), y: snap(cursor.y) }
}

/** Nábytek: věc v místnosti s volbami přichytávání ke zdi. */
export type Snappable = Placed & {
  /** Přichytává se tažení ke zdi? (výchozí ano) */
  snapToWalls?: boolean
  /** Zachovat při přichycení natočení, které kus má (jinak se vždy přichytí zády ke zdi). */
  keepRotation?: boolean
}

/**
 * Změna nábytku při tažení: přejde do místnosti pod kurzorem a jeho hrana se přichytí ke zdi,
 * když je blíž než FURNITURE_WALL_SNAP. Jinak stojí volně a drží natočení, které měl.
 *
 * Při přichycení se kus normálně otočí zády ke zdi. Pokud ho uživatel natočil ručně (`keepRotation`),
 * zůstane natočený o nejbližší čtvrtotáčku oproti zdi, takže postel otočená bokem se přichytí bokem.
 * Natočení, které není rovnoběžné se zdí (např. 30°), se nepřichytává vůbec - kus stojí volně.
 */
export function dragFurniturePatch(item: Snappable, rooms: Room[], walls: WallModel, cursor: Pt): Partial<Placed> {
  const current = rooms.find(r => r.id === item.roomId)
  const room = roomAt(rooms, cursor) ?? current
  if (!room) return {}

  const heading = current ? resolvePlacement(item, current, walls).rot : item.rot
  if (item.snapToWalls !== false) {
    const near = nearestEdge(room.pts, cursor)
    let turn: number | null = 0
    if (item.keepRotation) {
      const turns = normalizeAngle(heading - frontRotation(edgeInfo(room.pts, near.edge))) / QUARTER
      turn = Math.abs(turns - Math.round(turns)) * 90 <= ALIGN_TOLERANCE_DEG ? ((Math.round(turns) % 4) + 4) % 4 : null
    }
    if (turn !== null && near.dist < attachExtents(item, turn).perp / 2 + FURNITURE_WALL_SNAP) {
      return { roomId: room.id, attach: { edge: near.edge, along: snap(near.along), turn } }
    }
  }
  return { roomId: room.id, attach: undefined, x: snap(cursor.x), y: snap(cursor.y), rot: heading }
}

/**
 * Natočení věci na úhel `rot` (rad). Stojí-li věc u zdi a nový úhel je rovnoběžný se zdí (násobek 90° vůči ní),
 * zůstane u zdi a jen změní čtvrtotáčku. Jinak se uvolní ze zdi, zůstane na místě a natočí se volně.
 */
export function rotatedPatch(item: Placed, room: Room | undefined, walls: WallModel, rot: number): Partial<Placed> {
  if (item.attach && room && item.attach.edge < room.pts.length) {
    const turns = normalizeAngle(rot - frontRotation(edgeInfo(room.pts, item.attach.edge))) / QUARTER
    if (Math.abs(turns - Math.round(turns)) * 90 < 0.5) {
      return { attach: { ...item.attach, turn: ((Math.round(turns) % 4) + 4) % 4 } }
    }
  }
  const here = room ? resolvePlacement(item, room, walls) : { x: item.x, y: item.y }
  return { attach: undefined, x: here.x, y: here.y, rot }
}

/**
 * Tažení za konec věci podél zdi: tažený konec se posune na polohu `t` (cm od začátku stěny),
 * druhý konec zůstane na místě. Mění rozměr podél zdi (u věci otočené bokem je to hloubka) a střed.
 */
export function resizeAlongWall(
  item: Placed & { attach: NonNullable<Placed['attach']> },
  edgeLength: number,
  end: 'start' | 'end',
  t: number,
): Partial<Placed> & { attach: NonNullable<Placed['attach']> } {
  const turn = item.attach.turn ?? 0
  const size = attachExtents(item, turn).along
  let from = item.attach.along - size / 2
  let to = item.attach.along + size / 2
  if (end === 'start') from = clamp(snap(t), 0, to - MIN_OBSTACLE_WIDTH)
  else to = clamp(snap(t), from + MIN_OBSTACLE_WIDTH, edgeLength)
  const attach = { ...item.attach, along: (from + to) / 2 }
  return turn % 2 !== 0 ? { d: to - from, attach } : { w: to - from, attach }
}
