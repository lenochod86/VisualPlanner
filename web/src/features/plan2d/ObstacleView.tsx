import type { PointerEvent } from 'react'
import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Obstacle, Room } from '../../domain/types'
import { resolveObstacle } from '../../geometry/obstacles'
import type { WallModel } from '../../geometry/walls'

interface Props {
  obstacle: Obstacle
  room: Room
  walls: WallModel
  selected: boolean
  k: number
  onPointerDown: (e: PointerEvent) => void
}

export function ObstacleView({ obstacle, room, walls, selected, k, onPointerDown }: Props) {
  const p = resolveObstacle(obstacle, room, walls)
  return (
    <rect
      x={-obstacle.w / 2} y={-obstacle.d / 2} width={obstacle.w} height={obstacle.d}
      transform={`translate(${p.x} ${p.y}) rotate(${(p.rot * 180) / Math.PI})`}
      fill={OBSTACLE_KINDS[obstacle.kind].color}
      stroke={selected ? '#2f6fed' : '#222'} strokeWidth={(selected ? 2 : 1) * k}
      style={{ cursor: 'grab' }}
      onPointerDown={onPointerDown}
    />
  )
}
