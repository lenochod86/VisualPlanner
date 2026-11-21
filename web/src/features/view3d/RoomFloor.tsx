import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ROOM_TYPES } from '../../domain/catalog'
import type { Room } from '../../domain/types'
import { buildFloorGeometry } from './wallGeometry'

export function RoomFloor({ room }: { room: Room }) {
  const geometry = useMemo(() => buildFloorGeometry(room), [room.pts])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={ROOM_TYPES[room.type].color} side={THREE.DoubleSide} />
    </mesh>
  )
}
