import type { PointerEvent } from 'react'
import type { Obstacle, Room } from '../../domain/types'
import { resolveObstacle } from '../../geometry/obstacles'
import type { WallModel } from '../../geometry/walls'

interface Props {
  obstacle: Obstacle
  room: Room
  walls: WallModel
  k: number
  onPointerDown: (e: PointerEvent, end: 'start' | 'end') => void
}

/** Úchyty na obou koncích vybraného okna/dveří: tažením se mění jejich šířka podél zdi. */
export function ObstacleHandles({ obstacle, room, walls, k, onPointerDown }: Props) {
  if (!obstacle.attach) return null  // volně stojící věci nemají zeď, podél které by se táhly
  const p = resolveObstacle(obstacle, room, walls)
  const dir = { x: Math.cos(p.rot), y: Math.sin(p.rot) }
  const cursor = Math.abs(dir.x) > 0.5 ? 'ew-resize' : 'ns-resize'

  return (
    <>
      {(['start', 'end'] as const).map(end => {
        const sign = end === 'start' ? -1 : 1
        return (
          <circle
            key={end}
            cx={p.x + dir.x * sign * obstacle.w / 2} cy={p.y + dir.y * sign * obstacle.w / 2}
            r={6 * k} fill="#fff" stroke="#2f6fed" strokeWidth={2 * k}
            style={{ cursor }}
            onPointerDown={e => onPointerDown(e, end)}
          />
        )
      })}
    </>
  )
}
