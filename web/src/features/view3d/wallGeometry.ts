// Tvar zdí a podlah pro 3D.
//
// Zeď je rozdělená na KUSY po stěnách místností, aby každá stěna mohla mít vlastní materiál:
//  - kus stěny = čtyřúhelník mezi vnitřní a vnější hranou stěny (rohy v pokosu);
//  - SDÍLENÁ zeď se v místě překryvu rozdělí uprostřed: každá místnost vlastní polovinu na své straně
//    (takže koupelna může mít obklad a chodba omítku);
//  - kusy se navzájem neprotínají: z každého se odečtou kusy vytvořené dříve a vnitřky ostatních místností
//    (jinak by se na rozích překrývaly shodné plochy a blikaly);
//  - skryté stěny (režim "skrytá", nebo "auto" u stěny uvnitř jiné místnosti) se nevytvoří vůbec.
//
// Otvory (okna, dveře) se dělají po výškových pásech: v každém pásu je půdorys kusu bez těch otvorů,
// které pásem procházejí. Každý pás se vytáhne jako samostatné těleso.
import polygonClipping, { type Geom, type MultiPolygon, type Ring } from 'polygon-clipping'
import * as THREE from 'three'
import type { Pt, Room } from '../../domain/types'
import type { Opening } from '../../geometry/openings'
import { edgeInfo } from '../../geometry/polygon'
import { wallQuad, type WallModel } from '../../geometry/walls'

const toRing = (pts: Pt[]): Ring => pts.map(p => [p.x, p.y])

export interface WallPiece {
  roomId: string
  /** Index stěny v místnosti (podle něj se bere materiál). */
  edge: number
  footprint: MultiPolygon
}

/** Obdélníky, které z kusu stěny odřežou "druhou polovinu" sdílené zdi (ta patří sousední místnosti). */
function partnerHalfCuts(room: Room, edge: number, rooms: Room[], walls: WallModel): Geom[] {
  const { thickness, partners } = walls.info(room.id, edge)
  const e = edgeInfo(room.pts, edge)
  const at = (s: number, d: number): Pt => ({
    x: e.a.x + e.dir.x * s + e.outward.x * d,
    y: e.a.y + e.dir.y * s + e.outward.y * d,
  })

  const cuts: Geom[] = []
  for (const partner of partners) {
    const other = rooms.find(r => r.id === partner.roomId)
    if (!other) continue
    const f = edgeInfo(other.pts, partner.edge)
    const along = (p: Pt) => (p.x - e.a.x) * e.dir.x + (p.y - e.a.y) * e.dir.y
    const s0 = Math.max(0, Math.min(along(f.a), along(f.b)))
    const s1 = Math.min(e.len, Math.max(along(f.a), along(f.b)))
    if (s1 <= s0) continue
    // vzdálenější polovina tloušťky (od t/2 ven); o kousek přesahuje, ať zůstane čistý řez
    cuts.push([toRing([at(s0, thickness / 2), at(s1, thickness / 2), at(s1, thickness + 1), at(s0, thickness + 1)])])
  }
  return cuts
}

/** Kusy zdí všech místností (bez otvorů), v pořadí místností a jejich stěn. */
export function buildWallPieces(rooms: Room[], walls: WallModel): WallPiece[] {
  const inners: Geom[] = rooms.map(r => [toRing(r.pts)])
  const pieces: WallPiece[] = []

  for (const room of rooms) {
    const n = room.pts.length
    const thicknesses = walls.thicknesses(room)
    const visible = walls.visibility(room)
    for (let edge = 0; edge < n; edge++) {
      const info = walls.info(room.id, edge)
      if (!info.visible) continue                      // skrytá / průhledná stěna se nekreslí
      // stěna uvnitř jiné místnosti (kuchyňský kout v obýváku) smí ležet v jejím vnitřku, jinak by se odečetla
      const interiors = inners.filter((_, i) => !info.containedIn.includes(rooms[i].id))
      const quad: Geom = [toRing(wallQuad(room.pts, thicknesses, visible, edge))]
      const footprint = polygonClipping.difference(
        quad, ...partnerHalfCuts(room, edge, rooms, walls), ...interiors, ...pieces.map(p => p.footprint),
      )
      if (footprint.length) pieces.push({ roomId: room.id, edge, footprint })
    }
  }
  return pieces
}

export interface WallBand { z0: number; z1: number; footprint: MultiPolygon }

/** Rozdělí zeď na výškové pásy podle otvorů. Sousední pásy se stejným půdorysem se slijí. */
export function wallBands(footprint: MultiPolygon, height: number, openings: Opening[]): WallBand[] {
  if (footprint.length === 0) return []
  const levels = [...new Set([0, height, ...openings.flatMap(o => [o.z0, o.z1])])]
    .filter(z => z >= 0 && z <= height)
    .sort((a, b) => a - b)

  const bands: WallBand[] = []
  let lastKey = ''
  for (let i = 0; i + 1 < levels.length; i++) {
    const [z0, z1] = [levels[i], levels[i + 1]]
    const cuts = openings.filter(o => o.z0 <= z0 && o.z1 >= z1).map(o => [toRing(o.corners)])
    const band = cuts.length ? polygonClipping.difference(footprint, ...cuts) : footprint
    const key = JSON.stringify(band)
    if (bands.length && key === lastKey) bands[bands.length - 1].z1 = z1
    else if (band.length) bands.push({ z0, z1, footprint: band })
    lastKey = key
  }
  return bands
}

export interface WallSolid { roomId: string; edge: number; geometry: THREE.BufferGeometry }

const toVectors = (ring: Ring) => {
  const points = ring.map(([x, y]) => new THREE.Vector2(x, y))
  const first = ring[0], last = ring[ring.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) points.pop() // knihovna vrací uzavřené okruhy
  return points
}

/**
 * Plán (x, y) + výška -> 3D (x, výška, z = y). Otočení o +90° kolem X je skutečná rotace (nezrcadlí),
 * takže plochy míří správně ven. Vytažení jde "dolů" (do -y), proto se pak posune na `top`.
 */
function toWorld(geometry: THREE.BufferGeometry, top?: number) {
  geometry.rotateX(Math.PI / 2)
  if (top !== undefined) geometry.translate(0, top, 0)
}

export function extrudeFootprint(footprint: MultiPolygon, z0: number, z1: number): THREE.BufferGeometry {
  const shapes = footprint.map(([outer, ...holes]) => {
    const shape = new THREE.Shape(toVectors(outer))
    shape.holes = holes.map(h => new THREE.Path(toVectors(h)))
    return shape
  })
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth: z1 - z0, bevelEnabled: false })
  toWorld(geometry, z1)
  return geometry
}

/** Tělesa zdí; každé patří jedné stěně jedné místnosti. */
export function buildWallSolids(rooms: Room[], walls: WallModel, openings: Opening[]): WallSolid[] {
  return buildWallPieces(rooms, walls).flatMap(piece => {
    const height = rooms.find(r => r.id === piece.roomId)?.height ?? 0
    // otvor řeže zeď bez ohledu na to, které místnosti patří
    return wallBands(piece.footprint, height, openings).map(band => ({
      roomId: piece.roomId, edge: piece.edge, geometry: extrudeFootprint(band.footprint, band.z0, band.z1),
    }))
  })
}

export function buildFloorGeometry(room: Room): THREE.BufferGeometry {
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(room.pts.map(p => new THREE.Vector2(p.x, p.y))))
  toWorld(geometry)
  return geometry
}
