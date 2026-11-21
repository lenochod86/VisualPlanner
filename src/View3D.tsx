import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from './store'
import { OBS_KINDS, ROOM_TYPES } from './constants'
import { bbox, edgeInfo, resolveObs } from './geometry'
import type { Room } from './types'

function RoomMesh({ room, opacity }: { room: Room; opacity: number }) {
  const floor = useMemo(() => {
    // rotateX(-90°) zobrazí (x, y) -> (x, 0, -y); proto předáváme -y, aby vyšlo z = y
    const s = new THREE.Shape(room.pts.map(p => new THREE.Vector2(p.x, -p.y)))
    return new THREE.ShapeGeometry(s)
  }, [room.pts])

  return (
    <group>
      <mesh geometry={floor} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={ROOM_TYPES[room.type].color} side={THREE.DoubleSide} />
      </mesh>
      {room.pts.map((_, i) => {
        const e = edgeInfo(room.pts, i)
        const t = room.wallT
        return (
          <mesh key={i}
            position={[(e.a.x + e.b.x) / 2 + e.outward.x * t / 2, room.height / 2, (e.a.y + e.b.y) / 2 + e.outward.y * t / 2]}
            rotation={[0, -Math.atan2(e.dir.y, e.dir.x), 0]}>
            <boxGeometry args={[e.len + t, room.height, t]} />
            <meshStandardMaterial color="#f4f1ea" transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
          </mesh>
        )
      })}
    </group>
  )
}

export function View3D() {
  const { rooms, obstacles, wallOpacity } = useStore()
  const all = rooms.flatMap(r => r.pts)
  const b = all.length ? bbox(all) : { minX: 0, maxX: 400, minY: 0, maxY: 300 }
  const cx = (b.minX + b.maxX) / 2, cz = (b.minY + b.maxY) / 2
  const span = Math.max(b.maxX - b.minX, b.maxY - b.minY, 300)

  return (
    <Canvas camera={{ position: [cx + span * 0.9, span * 1.0, cz + span * 1.1], fov: 45, near: 1, far: 20000 }}>
      <color attach="background" args={['#eef1f5']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[cx + 500, 900, cz + 300]} intensity={1.1} />
      <Grid position={[cx, -0.5, cz]} args={[4000, 4000]} cellSize={10} sectionSize={100}
        cellColor="#d5d9df" sectionColor="#b3b9c2" fadeDistance={3000} infiniteGrid />
      {rooms.map(r => <RoomMesh key={r.id} room={r} opacity={wallOpacity} />)}
      {obstacles.map(o => {
        const room = rooms.find(r => r.id === o.roomId)
        if (!room) return null
        const p = resolveObs(o, room)
        const wall = OBS_KINDS[o.kind].wall
        return (
          <mesh key={o.id} position={[p.x, o.elev + o.h / 2, p.y]} rotation={[0, -p.rot, 0]}>
            <boxGeometry args={[o.w, o.h, wall ? room.wallT + 2 : o.d]} />
            <meshStandardMaterial color={OBS_KINDS[o.kind].color} transparent={o.kind === 'window'} opacity={o.kind === 'window' ? 0.55 : 1} />
          </mesh>
        )
      })}
      <OrbitControls makeDefault target={[cx, 80, cz]} maxPolarAngle={Math.PI / 2 - 0.02} />
    </Canvas>
  )
}
