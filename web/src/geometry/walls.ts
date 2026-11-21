// Model zdí. Každá stěna místnosti má vlastní tloušťku. Dvě stěny sousedních místností
// tvoří SDÍLENOU zeď, když jsou rovnoběžné, otočené zády k sobě, překrývají se a mezi nimi je
// malá mezera - ta mezera JE tloušťka společné zdi. Sdílenost se jen odvozuje z polohy místností
// (nic dalšího se neukládá), takže ji nikdy neohrozí nesoulad dat.
import { DEFAULT_WALL_THICKNESS, MAX_SHARED_WALL, MIN_SHARED_OVERLAP } from '../config'
import type { Pt, Room } from '../domain/types'
import { edgeInfo, moveEdge, type EdgeInfo } from './polygon'

export interface WallRef { roomId: string; edge: number }

export interface WallInfo {
  /** Skutečná tloušťka: u sdílené zdi mezera mezi místnostmi, jinak hodnota uložená v místnosti. */
  thickness: number
  /** Stěny jiných místností, se kterými je tahle zeď společná (prázdné = obvodová/vlastní zeď). */
  partners: WallRef[]
}

export interface WallModel {
  info(roomId: string, edge: number): WallInfo
  /** Tloušťky všech stěn místnosti v pořadí stěn. */
  thicknesses(room: Room): number[]
}

const keyOf = (roomId: string, edge: number) => `${roomId}:${edge}`

/** Mezera (= tloušťka sdílené zdi) mezi dvěma stěnami, nebo null, pokud nejsou sdílené. */
function sharedGap(a: EdgeInfo, b: EdgeInfo): number | null {
  if (a.horizontal !== b.horizontal) return null
  const axis = a.horizontal ? 'y' : 'x'      // osa kolmá na stěnu
  const along = a.horizontal ? 'x' : 'y'     // osa podél stěny
  const facingA = Math.sign(a.outward[axis])
  if (facingA === Math.sign(b.outward[axis])) return null  // musí být zády k sobě

  const gap = (b.a[axis] - a.a[axis]) * facingA
  if (gap <= 0 || gap > MAX_SHARED_WALL) return null

  const overlap =
    Math.min(Math.max(a.a[along], a.b[along]), Math.max(b.a[along], b.b[along])) -
    Math.max(Math.min(a.a[along], a.b[along]), Math.min(b.a[along], b.b[along]))
  return overlap >= MIN_SHARED_OVERLAP ? gap : null
}

export function buildWallModel(rooms: Room[]): WallModel {
  const shared = new Map<string, { ref: WallRef; gap: number }[]>()
  const link = (from: WallRef, to: WallRef, gap: number) => {
    const k = keyOf(from.roomId, from.edge)
    shared.set(k, [...(shared.get(k) ?? []), { ref: to, gap }])
  }

  for (let ai = 0; ai < rooms.length; ai++) {
    for (let bi = ai + 1; bi < rooms.length; bi++) {
      const A = rooms[ai], B = rooms[bi]
      A.pts.forEach((_, i) => B.pts.forEach((__, j) => {
        const gap = sharedGap(edgeInfo(A.pts, i), edgeInfo(B.pts, j))
        if (gap === null) return
        link({ roomId: A.id, edge: i }, { roomId: B.id, edge: j }, gap)
        link({ roomId: B.id, edge: j }, { roomId: A.id, edge: i }, gap)
      }))
    }
  }

  const roomById = new Map(rooms.map(r => [r.id, r]))
  const info: WallModel['info'] = (roomId, edge) => {
    const links = shared.get(keyOf(roomId, edge))
    if (links?.length) {
      return { thickness: Math.min(...links.map(l => l.gap)), partners: links.map(l => l.ref) }
    }
    return { thickness: roomById.get(roomId)?.walls[edge] ?? DEFAULT_WALL_THICKNESS, partners: [] }
  }
  return { info, thicknesses: room => room.pts.map((_, i) => info(room.id, i).thickness) }
}

/**
 * Změní tloušťku zdi `edge` v místnosti `roomId`.
 * - Obvodová zeď: vnitřní líc zůstane, zeď roste ven.
 * - Sdílená zeď: osa zdi zůstane na místě, obě sousední místnosti se o půl změny zmenší/zvětší.
 * Vrací nové místnosti, nebo null, pokud by nějaká místnost zdegenerovala (příliš krátká stěna).
 */
export function applyWallThickness(rooms: Room[], roomId: string, edge: number, thickness: number): Room[] | null {
  const { thickness: current, partners } = buildWallModel(rooms).info(roomId, edge)
  const inwardShift = partners.length ? (thickness - current) / 2 : 0

  const working = new Map(rooms.map(r => [r.id, r]))
  for (const side of [{ roomId, edge }, ...partners]) {
    const room = working.get(side.roomId)!
    let pts = room.pts
    if (inwardShift !== 0) {
      const e = edgeInfo(pts, side.edge)
      const axis = e.horizontal ? 'y' : 'x'
      pts = moveEdge(pts, side.edge, e.a[axis] + e.inward[axis] * inwardShift)
      if (pts === room.pts) return null
    }
    working.set(side.roomId, { ...room, pts, walls: room.walls.map((w, i) => (i === side.edge ? thickness : w)) })
  }
  return rooms.map(r => working.get(r.id)!)
}

function intersect(p1: Pt, d1: Pt, p2: Pt, d2: Pt): Pt {
  const cross = d1.x * d2.y - d1.y * d2.x
  if (Math.abs(cross) < 1e-9) return p2
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / cross
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t }
}

/**
 * Vnější obrys zdí: každá stěna se odsune ven o svou tloušťku a sousední odsunuté
 * přímky se protnou v rozích. Vrchol i odpovídá vrcholu i vnitřního polygonu.
 */
export function outerPolygon(pts: Pt[], thicknesses: number[]): Pt[] {
  const n = pts.length
  const lines = pts.map((_, i) => {
    const e = edgeInfo(pts, i)
    return { point: { x: e.a.x + e.outward.x * thicknesses[i], y: e.a.y + e.outward.y * thicknesses[i] }, dir: e.dir }
  })
  return pts.map((_, i) => {
    const prev = lines[(i + n - 1) % n], cur = lines[i]
    return intersect(prev.point, prev.dir, cur.point, cur.dir)
  })
}
