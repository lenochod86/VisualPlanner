import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Obstacle, Room } from '../../domain/types'
import { resolvePlacement, wallThicknessFor } from '../../geometry/placement'
import type { WallModel } from '../../geometry/walls'

export function ObstacleMesh({ obstacle, room, walls }: { obstacle: Obstacle; room: Room; walls: WallModel }) {
  const p = resolvePlacement(obstacle, room, walls, OBSTACLE_KINDS[obstacle.kind].inWall)
  const spec = OBSTACLE_KINDS[obstacle.kind]
  const isGlass = obstacle.kind === 'window'
  // okna a dveře jsou o trochu tlustší než zeď, aby byly vidět (zatím se zeď nevyřezává)
  const depth = spec.inWall ? wallThicknessFor(obstacle, room, walls) + 2 : obstacle.d
  return (
    <mesh position={[p.x, obstacle.elev + obstacle.h / 2, p.y]} rotation={[0, -p.rot, 0]}>
      <boxGeometry args={[obstacle.w, obstacle.h, depth]} />
      <meshStandardMaterial color={spec.color} transparent={isGlass} opacity={isGlass ? 0.55 : 1} />
    </mesh>
  )
}
