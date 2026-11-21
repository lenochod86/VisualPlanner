import type { PointerEvent } from 'react'
import { ROOM_TYPES } from '../../domain/catalog'
import type { Room } from '../../domain/types'
import { formatAreaM2 } from '../../format'
import { centroid, polygonArea } from '../../geometry/polygon'
import { DimensionLabel } from './DimensionLabel'

interface Props {
  room: Room
  selected: boolean
  k: number
  onBodyPointerDown: (e: PointerEvent) => void
  onEdgePointerDown: (e: PointerEvent, edge: number) => void
  onEditDimension: (edge: number) => void
}

export function RoomView({ room, selected, k, onBodyPointerDown, onEdgePointerDown, onEditDimension }: Props) {
  const points = room.pts.map(p => `${p.x},${p.y}`).join(' ')
  const label = centroid(room.pts)
  return (
    <g className="room">
      {/* Zeď = obrys silný 2× wallT; polovina uvnitř se překryje podlahou, venku zbyde zeď tloušťky wallT. */}
      <polygon
        points={points} fill={ROOM_TYPES[room.type].color}
        stroke="#33383f" strokeWidth={room.wallT * 2} strokeLinejoin="miter" paintOrder="stroke"
        style={{ cursor: 'move' }}
        onPointerDown={onBodyPointerDown}
      />
      {selected && <polygon points={points} fill="none" stroke="#2f6fed" strokeWidth={2 * k} pointerEvents="none" />}

      <text x={label.x} y={label.y} textAnchor="middle" pointerEvents="none" fill="#333">
        <tspan fontSize={15 * k} fontWeight={600}>{room.name}</tspan>
        <tspan x={label.x} dy={16 * k} fontSize={12 * k} fill="#666">{formatAreaM2(polygonArea(room.pts))}</tspan>
      </text>

      {room.pts.map((_, i) => (
        <DimensionLabel
          key={i} pts={room.pts} edge={i} k={k}
          onDragStart={e => onEdgePointerDown(e, i)}
          onEdit={() => onEditDimension(i)}
        />
      ))}
    </g>
  )
}
