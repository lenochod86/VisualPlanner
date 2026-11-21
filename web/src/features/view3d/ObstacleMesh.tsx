import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Obstacle, Room } from '../../domain/types'
import { resolveObstacle } from '../../geometry/obstacles'

export function ObstacleMesh({ obstacle, room }: { obstacle: Obstacle; room: Room }) {
  const p = resolveObstacle(obstacle, room)
  const spec = OBSTACLE_KINDS[obstacle.kind]
  const isGlass = obstacle.kind === 'window'
  // okna a dveře jsou o trochu tlustší než zeď, aby byly vidět (zatím se zeď nevyřezává)
  const depth = spec.inWall ? room.wallT + 2 : obstacle.d
  return (
    <mesh position={[p.x, obstacle.elev + obstacle.h / 2, p.y]} rotation={[0, -p.rot, 0]}>
      <boxGeometry args={[obstacle.w, obstacle.h, depth]} />
      <meshStandardMaterial color={spec.color} transparent={isGlass} opacity={isGlass ? 0.55 : 1} />
    </mesh>
  )
}
