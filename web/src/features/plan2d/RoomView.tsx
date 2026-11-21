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
  /** Které stěny se kreslí plné; skryté (průhledné) se ukážou jen čárkovaně. */
  visibleEdges: boolean[]
  selected: boolean
  highlightedEdge: number | null
  k: number
  onBodyPointerDown: (e: PointerEvent) => void
  onEdgePointerDown: (e: PointerEvent, edge: number) => void
  onEditDimension: (edge: number) => void
}

const ring = (pts: Pt[]) => `M${pts.map(p => `${p.x} ${p.y}`).join('L')}Z`

export function RoomView({ room, thicknesses, visibleEdges, selected, highlightedEdge, k, onBodyPointerDown, onEdgePointerDown, onEditDimension }: Props) {
  const points = room.pts.map(p => `${p.x},${p.y}`).join(' ')
  const label = centroid(room.pts)
  // zeď každé viditelné stěny = čtyřúhelník mezi vnitřním a vnějším lícem (rohy v pokosu)
  const outer = outerPolygon(room.pts, thicknesses)
  const n = room.pts.length
  const walls = room.pts.map((_, i) => (visibleEdges[i] ? ring([room.pts[i], room.pts[(i + 1) % n], outer[(i + 1) % n], outer[i]]) : '')).join('')
  const highlighted = highlightedEdge === null ? null : edgeInfo(room.pts, highlightedEdge)

  return (
    <g className="room">
      <path d={walls} fill="#33383f" style={{ cursor: 'move' }} onPointerDown={onBodyPointerDown} />
      <polygon points={points} fill={ROOM_TYPES[room.type].color} style={{ cursor: 'move' }} onPointerDown={onBodyPointerDown} />
      {/* skrytá (průhledná) stěna: jen čárkovaná čára na jejím líci */}
      {room.pts.map((_, i) => {
        if (visibleEdges[i]) return null
        const e = edgeInfo(room.pts, i)
        return <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke='#8a9099' strokeWidth={1.5 * k} strokeDasharray={`${6 * k} ${4 * k}`} pointerEvents="none" />
      })}
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
