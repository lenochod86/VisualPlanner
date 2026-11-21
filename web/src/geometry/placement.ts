// Poloha věcí v místnosti (překážky i nábytek): výpočet skutečné polohy, přichytávání ke zdi a tažení.
import { FURNITURE_WALL_SNAP, MIN_OBSTACLE_WIDTH, OBSTACLE_WALL_SNAP } from '../config'
import type { Placed, Pt, Room } from '../domain/types'
import { clamp, snap } from './math'
import { containsPoint, edgeInfo, type EdgeInfo } from './polygon'
import type { WallModel } from './walls'

export interface Placement { x: number; y: number; rot: number }

/** Tloušťka zdi, ke které je věc připnutá (jinak první stěny). */
export function wallThicknessFor(item: Placed, room: Room, walls: WallModel): number {
  return walls.info(room.id, item.attach?.edge ?? 0).thickness
}

/**
 * Skutečná poloha věci. Je-li připnutá ke stěně, počítá se ze stěny (a tak ji sleduje při změně rozměrů).
 * Lokální osa "dopředu" (+y, od zdi) vždy míří do místnosti. `inWall` = věc leží uprostřed zdi (okno, dveře).
 */
export function resolvePlacement(item: Placed, room: Room, walls: WallModel, inWall = false): Placement {
  if (!item.attach || item.attach.edge >= room.pts.length) return { x: item.x, y: item.y, rot: item.rot }
  const e = edgeInfo(room.pts, item.attach.edge)
  const along = clamp(item.attach.along, item.w / 2, e.len - item.w / 2)
  const offset = inWall ? -wallThicknessFor(item, room, walls) / 2 : item.d / 2
  return {
    x: e.a.x + e.dir.x * along + e.inward.x * offset,
    y: e.a.y + e.dir.y * along + e.inward.y * offset,
    rot: frontRotation(e),
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

/** Místnost, ve které leží bod (vnitřek, bez zdí). */
export const roomAt = (rooms: Room[], p: Pt): Room | undefined => rooms.find(r => containsPoint(r.pts, p))

/** Změna překážky při tažení kurzorem: okna/dveře jsou vždy na zdi, ostatní se ke zdi přichytí z blízka. */
export function dragObstaclePatch(room: Room, cursor: Pt, inWall: boolean): Partial<Placed> {
  const near = nearestEdge(room.pts, cursor)
  if (inWall || near.dist < OBSTACLE_WALL_SNAP) {
    return { attach: { edge: near.edge, along: snap(near.along) } }
  }
  return { attach: undefined, x: snap(cursor.x), y: snap(cursor.y) }
}

/** Nábytek: věc v místnosti, která se navíc může (nemusí) přichytávat ke zdi. */
export type Snappable = Placed & { snapToWalls?: boolean }

/**
 * Změna nábytku při tažení: přejde do místnosti pod kurzorem a jeho zadní hrana se přichytí ke zdi,
 * když je blíž než FURNITURE_WALL_SNAP. Jinak stojí volně a drží natočení, které měl.
 * Kus s vypnutým přichytáváním (uživatel ho volně otočil) se ke zdi nepřichytává nikdy.
 */
export function dragFurniturePatch(item: Snappable, rooms: Room[], walls: WallModel, cursor: Pt): Partial<Placed> {
  const current = rooms.find(r => r.id === item.roomId)
  const room = roomAt(rooms, cursor) ?? current
  if (!room) return {}
  const near = nearestEdge(room.pts, cursor)
  if (item.snapToWalls !== false && near.dist < item.d / 2 + FURNITURE_WALL_SNAP) {
    return { roomId: room.id, attach: { edge: near.edge, along: snap(near.along) } }
  }
  const rot = current ? resolvePlacement(item, current, walls).rot : item.rot
  return { roomId: room.id, attach: undefined, x: snap(cursor.x), y: snap(cursor.y), rot }
}

/**
 * Volné natočení věci na úhel `rot` (rad): věc se uvolní ze zdi, zůstane na místě, kde stála, a natočí se.
 * (Přichytávání ke zdi se vypíná zvlášť, viz `Snappable` - jinak by ji tažení vrátilo ke zdi.)
 */
export function freeRotationPatch(item: Placed, room: Room | undefined, walls: WallModel, rot: number): Partial<Placed> {
  const here = room ? resolvePlacement(item, room, walls) : { x: item.x, y: item.y }
  return { attach: undefined, x: here.x, y: here.y, rot }
}

/**
 * Tažení za konec věci podél zdi: tažený konec se posune na polohu `t` (cm od začátku stěny),
 * druhý konec zůstane na místě. Vrací změnu šířky a středu.
 */
export function resizeAlongWall(
  item: Placed & { attach: NonNullable<Placed['attach']> },
  edgeLength: number,
  end: 'start' | 'end',
  t: number,
): { w: number; attach: { edge: number; along: number } } {
  let from = item.attach.along - item.w / 2
  let to = item.attach.along + item.w / 2
  if (end === 'start') from = clamp(snap(t), 0, to - MIN_OBSTACLE_WIDTH)
  else to = clamp(snap(t), from + MIN_OBSTACLE_WIDTH, edgeLength)
  return { w: to - from, attach: { edge: item.attach.edge, along: (from + to) / 2 } }
}
