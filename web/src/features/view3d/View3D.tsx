import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { bbox } from '../../geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { useWallModel } from '../../store/useWallModel'
import { ObstacleMesh } from './ObstacleMesh'
import { RoomMesh } from './RoomMesh'

export function View3D() {
  const rooms = useProjectStore(s => s.rooms)
  const obstacles = useProjectStore(s => s.obstacles)
  const wallOpacity = useUiStore(s => s.wallOpacity)
  const walls = useWallModel()

  const points = rooms.flatMap(r => r.pts)
  const b = points.length ? bbox(points) : { minX: 0, maxX: 400, minY: 0, maxY: 300 }
  const cx = (b.minX + b.maxX) / 2, cz = (b.minY + b.maxY) / 2
  const span = Math.max(b.maxX - b.minX, b.maxY - b.minY, 300)

  return (
    <Canvas camera={{ position: [cx + span * 0.9, span, cz + span * 1.1], fov: 45, near: 1, far: 20000 }}>
      <color attach="background" args={['#eef1f5']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[cx + 500, 900, cz + 300]} intensity={1.1} />
      <Grid position={[cx, -0.5, cz]} args={[4000, 4000]} cellSize={10} sectionSize={100}
        cellColor="#d5d9df" sectionColor="#b3b9c2" fadeDistance={3000} infiniteGrid />

      {rooms.map(room => <RoomMesh key={room.id} room={room} thicknesses={walls.thicknesses(room)} wallOpacity={wallOpacity} />)}
      {obstacles.map(obstacle => {
        const room = rooms.find(r => r.id === obstacle.roomId)
        return room && <ObstacleMesh key={obstacle.id} obstacle={obstacle} room={room} walls={walls} />
      })}

      <OrbitControls makeDefault target={[cx, 80, cz]} maxPolarAngle={Math.PI / 2 - 0.02} />
    </Canvas>
  )
}
