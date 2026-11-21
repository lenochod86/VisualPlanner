import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { floorColor } from '../../domain/finishes'
import type { Room } from '../../domain/types'
import { buildFloorGeometry } from './wallGeometry'

export function RoomFloor({ room }: { room: Room }) {
  const geometry = useMemo(() => buildFloorGeometry(room), [room.pts])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={floorColor(room)} side={THREE.DoubleSide} />
    </mesh>
  )
}
