import { useMemo } from 'react'
import * as THREE from 'three'
import { ROOM_TYPES } from '../../domain/catalog'
import type { Room } from '../../domain/types'
import { edgeInfo } from '../../geometry/polygon'

/** Podlaha + stěny jedné místnosti. Převod souřadnic: plán (x, y) -> 3D (x, výška, z = y). */
export function RoomMesh({ room, wallOpacity }: { room: Room; wallOpacity: number }) {
  const floor = useMemo(() => {
    // rotace o -90° kolem X zobrazí (x, y) na (x, 0, -y); předáváme proto -y, aby vyšlo z = y
    const shape = new THREE.Shape(room.pts.map(p => new THREE.Vector2(p.x, -p.y)))
    return new THREE.ShapeGeometry(shape)
  }, [room.pts])

  const transparent = wallOpacity < 1
  return (
    <group>
      <mesh geometry={floor} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={ROOM_TYPES[room.type].color} side={THREE.DoubleSide} />
      </mesh>
      {room.pts.map((_, i) => {
        const e = edgeInfo(room.pts, i)
        const t = room.wallT
        return (
          // zeď je vně od vnitřního líce: střed posunutý o t/2 ven, o t delší kvůli rohům
          <mesh key={i}
            position={[(e.a.x + e.b.x) / 2 + e.outward.x * t / 2, room.height / 2, (e.a.y + e.b.y) / 2 + e.outward.y * t / 2]}
            rotation={[0, -Math.atan2(e.dir.y, e.dir.x), 0]}>
            <boxGeometry args={[e.len + t, room.height, t]} />
            <meshStandardMaterial color="#f4f1ea" transparent={transparent} opacity={wallOpacity} depthWrite={!transparent} />
          </mesh>
        )
      })}
    </group>
  )
}
