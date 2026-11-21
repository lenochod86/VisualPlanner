// Tvar zdí pro 3D. Zdi všech místností se nekreslí po jedné, ale spočítá se jejich SJEDNOCENÍ:
// půdorys zdí = (sjednocení vnějších obrysů) − (vnitřky místností). Sdílená zeď je tak jedno těleso
// a nikde se nepřekrývají dvě shodné plochy (to dělalo blikající artefakty).
import polygonClipping, { type MultiPolygon, type Ring } from 'polygon-clipping'
import * as THREE from 'three'
import type { Pt, Room } from '../../domain/types'
import { outerPolygon, type WallModel } from '../../geometry/walls'

const toRing = (pts: Pt[]): Ring => pts.map(p => [p.x, p.y])

/** Půdorys zdí místností o stejné výšce. */
export function wallFootprint(rooms: Room[], walls: WallModel): MultiPolygon {
  if (rooms.length === 0) return []
  const outers = rooms.map(r => [toRing(outerPolygon(r.pts, walls.thicknesses(r)))])
  const inners = rooms.map(r => [toRing(r.pts)])
  return polygonClipping.difference(polygonClipping.union(outers[0], ...outers.slice(1)), ...inners)
}

export interface WallSolid { height: number; geometry: THREE.BufferGeometry }

const toVectors = (ring: Ring) => {
  const points = ring.map(([x, y]) => new THREE.Vector2(x, y))
  const first = ring[0], last = ring[ring.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) points.pop() // knihovna vrací uzavřené okruhy
  return points
}

/** Plán (x, y) + výška -> 3D (x, výška, z = y). Otočení o +90° kolem X je skutečná rotace (nezrcadlí), takže plochy míří správně ven. */
function toWorld(geometry: THREE.BufferGeometry, height?: number) {
  geometry.rotateX(Math.PI / 2)                  // (x, y, z) -> (x, -z, y)
  if (height !== undefined) geometry.translate(0, height, 0)  // vytažení šlo dolů, posuneme ho nad podlahu
}

/** Zdi seskupené podle výšky místnosti (zeď mezi místnostmi různé výšky je vzácná, tam se mohou překrýt). */
export function buildWallSolids(rooms: Room[], walls: WallModel): WallSolid[] {
  const byHeight = new Map<number, Room[]>()
  for (const room of rooms) byHeight.set(room.height, [...(byHeight.get(room.height) ?? []), room])

  const solids: WallSolid[] = []
  for (const [height, group] of byHeight) {
    const shapes = wallFootprint(group, walls).map(([outer, ...holes]) => {
      const shape = new THREE.Shape(toVectors(outer))
      shape.holes = holes.map(h => new THREE.Path(toVectors(h)))
      return shape
    })
    if (shapes.length === 0) continue
    const geometry = new THREE.ExtrudeGeometry(shapes, { depth: height, bevelEnabled: false })
    toWorld(geometry, height)
    solids.push({ height, geometry })
  }
  return solids
}

export function buildFloorGeometry(room: Room): THREE.BufferGeometry {
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(room.pts.map(p => new THREE.Vector2(p.x, p.y))))
  toWorld(geometry)
  return geometry
}
