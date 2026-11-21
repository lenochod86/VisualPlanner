// Tvar zdí a podlah pro 3D.
//
// Zdi se počítají po místnostech: půdorys zdí místnosti = její vnější obrys − vnitřky VŠECH místností
// − vnější obrysy dřívějších místností. Poslední odečet zařídí, že sdílená zeď patří jen jedné místnosti
// a nikde se nepřekrývají dvě shodné plochy (to dělalo blikající artefakty).
//
// Otvory (okna, dveře) se dělají po výškových pásech: v každém pásu je půdorys zdi bez těch otvorů,
// které pásem procházejí. Každý pás se vytáhne jako samostatné těleso.
import polygonClipping, { type MultiPolygon, type Ring } from 'polygon-clipping'
import * as THREE from 'three'
import type { Pt, Room } from '../../domain/types'
import type { Opening } from '../../geometry/openings'
import { outerPolygon, type WallModel } from '../../geometry/walls'

const toRing = (pts: Pt[]): Ring => pts.map(p => [p.x, p.y])
const outerOf = (room: Room, walls: WallModel) => [toRing(outerPolygon(room.pts, walls.thicknesses(room)))]

/** Půdorys zdí místnosti `rooms[index]` (bez otvorů). */
export function roomWallFootprint(rooms: Room[], index: number, walls: WallModel): MultiPolygon {
  const inners = rooms.map(r => [toRing(r.pts)])
  const earlierOuters = rooms.slice(0, index).map(r => outerOf(r, walls))
  return polygonClipping.difference(outerOf(rooms[index], walls), ...inners, ...earlierOuters)
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

export interface WallSolid { roomId: string; geometry: THREE.BufferGeometry }

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

/** Tělesa zdí všech místností (každá místnost má vlastní, aby mohla mít vlastní materiál). */
export function buildWallSolids(rooms: Room[], walls: WallModel, openings: Opening[]): WallSolid[] {
  return rooms.flatMap((room, index) =>
    wallBands(roomWallFootprint(rooms, index, walls), room.height, openings) // otvor řeže zeď bez ohledu na to, které místnosti patří
      .map(band => ({ roomId: room.id, geometry: extrudeFootprint(band.footprint, band.z0, band.z1) })))
}

export function buildFloorGeometry(room: Room): THREE.BufferGeometry {
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(room.pts.map(p => new THREE.Vector2(p.x, p.y))))
  toWorld(geometry)
  return geometry
}
