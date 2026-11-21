import type { Room } from '../../domain/types'
import { formatAreaM2 } from '../../format'
import { centroid, polygonArea } from '../../geometry/polygon'
import { DimensionText } from './DimensionLabel'

/**
 * Popisky místnosti: název, plocha a kóty stěn. Kreslí se jako samostatná vrstva NAD nábytkem,
 * překážkami a elektrem, aby je nic nepřekrylo.
 */
export function RoomLabels({ room, k, onEditDimension }: {
  room: Room
  k: number
  onEditDimension: (edge: number) => void
}) {
  const c = centroid(room.pts)
  // bílý okraj písma drží popisek čitelný i nad nábytkem
  const halo = { stroke: '#ffffffd9', strokeWidth: 3 * k, paintOrder: 'stroke' as const }
  return (
    <g className="room">
      <text x={c.x} y={c.y} textAnchor="middle" pointerEvents="none" fill="#333" {...halo}>
        <tspan fontSize={15 * k} fontWeight={600}>{room.name}</tspan>
        <tspan x={c.x} dy={16 * k} fontSize={12 * k} fill="#666">{formatAreaM2(polygonArea(room.pts))}</tspan>
      </text>
      {room.pts.map((_, i) => (
        <DimensionText key={i} pts={room.pts} edge={i} k={k} onEdit={() => onEditDimension(i)} />
      ))}
    </g>
  )
}
