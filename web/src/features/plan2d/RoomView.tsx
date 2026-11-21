import type { PointerEvent } from 'react'
import { ROOM_TYPES } from '../../domain/catalog'
import type { Pt, Room } from '../../domain/types'
import { formatAreaM2 } from '../../format'
import { centroid, edgeInfo, polygonArea } from '../../geometry/polygon'
import { outerPolygon } from '../../geometry/walls'
import { DimensionLabel } from './DimensionLabel'

interface Props {
  room: Room
  /** Skutečné tloušťky zdí u jednotlivých stěn (sdílené zdi mají tloušťku podle mezery). */
  thicknesses: number[]
  selected: boolean
  highlightedEdge: number | null
  k: number
  onBodyPointerDown: (e: PointerEvent) => void
  onEdgePointerDown: (e: PointerEvent, edge: number) => void
  onEditDimension: (edge: number) => void
}

const ring = (pts: Pt[]) => `M${pts.map(p => `${p.x} ${p.y}`).join('L')}Z`

export function RoomView({ room, thicknesses, selected, highlightedEdge, k, onBodyPointerDown, onEdgePointerDown, onEditDimension }: Props) {
  const points = room.pts.map(p => `${p.x},${p.y}`).join(' ')
  const label = centroid(room.pts)
  // zdi = mezikruží mezi vnitřním a vnějším obrysem (evenodd udělá z vnitřního obrysu díru)
  const walls = ring(outerPolygon(room.pts, thicknesses)) + ring(room.pts)
  const highlighted = highlightedEdge === null ? null : edgeInfo(room.pts, highlightedEdge)

  return (
    <g className="room">
      <path d={walls} fill="#33383f" fillRule="evenodd" style={{ cursor: 'move' }} onPointerDown={onBodyPointerDown} />
      <polygon points={points} fill={ROOM_TYPES[room.type].color} style={{ cursor: 'move' }} onPointerDown={onBodyPointerDown} />
      {selected && <polygon points={points} fill="none" stroke="#2f6fed" strokeWidth={2 * k} pointerEvents="none" />}
      {highlighted && (
        <line x1={highlighted.a.x} y1={highlighted.a.y} x2={highlighted.b.x} y2={highlighted.b.y}
          stroke="#ff9800" strokeWidth={5 * k} pointerEvents="none" />
      )}

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
