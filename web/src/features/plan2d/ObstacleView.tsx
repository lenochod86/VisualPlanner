import type { PointerEvent } from 'react'
import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Obstacle, Room } from '../../domain/types'
import { doorSwing, swingSectorPath } from '../../geometry/doors'
import { resolvePlacement, wallThicknessFor } from '../../geometry/placement'
import type { WallModel } from '../../geometry/walls'

/** Jak se kreslí zametaná plocha dveří: klasický oblouk s křídlem (Půdorys), nebo jen jemný stín (ostatní záložky). */
export type SwingStyle = 'arc' | 'shadow'

interface Props {
  obstacle: Obstacle
  room: Room
  walls: WallModel
  selected: boolean
  swingStyle: SwingStyle
  k: number
  onPointerDown: (e: PointerEvent) => void
}

export function ObstacleView({ obstacle, room, walls, selected, swingStyle, k, onPointerDown }: Props) {
  const p = resolvePlacement(obstacle, room, walls, OBSTACLE_KINDS[obstacle.kind].inWall)
  const look = {
    fill: OBSTACLE_KINDS[obstacle.kind].color,
    stroke: selected ? '#2f6fed' : '#222', strokeWidth: (selected ? 2 : 1) * k,
    style: { cursor: 'grab' } as const,
  }
  const swing = obstacle.kind === 'door' ? doorSwing(obstacle, wallThicknessFor(obstacle, room, walls)) : null

  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${(p.rot * 180) / Math.PI})`}>
      {swing && swingStyle === 'arc' && (
        <g pointerEvents="none">
          <path d={swingSectorPath(swing)} fill="#9b6b4318" stroke="none" />
          {/* otevřené křídlo a dráha jeho konce */}
          <line x1={swing.hinge.x} y1={swing.hinge.y} x2={swing.openEnd.x} y2={swing.openEnd.y} stroke="#6b4a2d" strokeWidth={1.5 * k} />
          <path d={`M${swing.closedEnd.x} ${swing.closedEnd.y}A${swing.radius} ${swing.radius} 0 0 ${swing.sweep} ${swing.openEnd.x} ${swing.openEnd.y}`}
            fill="none" stroke="#6b4a2d" strokeWidth={1 * k} strokeDasharray={`${5 * k} ${3 * k}`} />
        </g>
      )}
      {swing && swingStyle === 'shadow' && (
        <path d={swingSectorPath(swing)} fill="#00000020" stroke="none" pointerEvents="none" />
      )}
      {/* pevný bod "kruh" je elipsa o rozměrech šířka × hloubka, ostatní prvky obdélník */}
      {OBSTACLE_KINDS[obstacle.kind].round
        ? <ellipse cx={0} cy={0} rx={obstacle.w / 2} ry={obstacle.d / 2} {...look} onPointerDown={onPointerDown} />
        : <rect x={-obstacle.w / 2} y={-obstacle.d / 2} width={obstacle.w} height={obstacle.d} {...look} onPointerDown={onPointerDown} />}
    </g>
  )
}
