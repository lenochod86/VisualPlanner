import { useMemo } from 'react'
import * as THREE from 'three'
import { ROOM_TYPES } from '../../domain/catalog'
import type { Pt, Room } from '../../domain/types'
import { outerPolygon } from '../../geometry/walls'

// Převod souřadnic: plán (x, y) -> 3D (x, výška, z = y). Po rotaci o -90° kolem X by se (x, y) zobrazilo
// na (x, 0, -y), proto tvary stavíme z bodů (x, -y), aby vyšlo z = y.
const toShapePoints = (pts: Pt[]) => pts.map(p => new THREE.Vector2(p.x, -p.y))

interface Props {
  room: Room
  thicknesses: number[]
  wallOpacity: number
}

/** Podlaha a zdi jedné místnosti. Zdi jsou jedno těleso: vnější obrys s dírou ve tvaru místnosti, vytažený do výšky. */
export function RoomMesh({ room, thicknesses, wallOpacity }: Props) {
  const floor = useMemo(() => new THREE.ShapeGeometry(new THREE.Shape(toShapePoints(room.pts))), [room.pts])

  const thicknessKey = thicknesses.join(',')
  const walls = useMemo(() => {
    const shape = new THREE.Shape(toShapePoints(outerPolygon(room.pts, thicknesses)))
    shape.holes.push(new THREE.Path(toShapePoints(room.pts)))
    return new THREE.ExtrudeGeometry(shape, { depth: room.height, bevelEnabled: false })
  }, [room.pts, room.height, thicknessKey])

  const transparent = wallOpacity < 1
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={floor}>
        <meshStandardMaterial color={ROOM_TYPES[room.type].color} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={walls}>
        <meshStandardMaterial color="#f4f1ea" transparent={transparent} opacity={wallOpacity} depthWrite={!transparent} />
      </mesh>
    </group>
  )
}
