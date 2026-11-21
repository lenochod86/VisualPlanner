import type { PointerEvent } from 'react'
import { ELECTRIC_KINDS } from '../../domain/electricCatalog'
import type { ElectricPoint, Room } from '../../domain/types'
import { boardSize, electricPosition } from '../../geometry/electric'

interface Props {
  point: ElectricPoint
  room: Room
  selected: boolean
  /** Je to bod, ze kterého právě vedeme kabel (čeká se na cílový bod)? */
  pending: boolean
  k: number
  onPointerDown: (e: PointerEvent) => void
}

/** Schematická značka bodu v půdorysu. Lokální osy: x podél zdi, y směrem do místnosti. */
export function ElectricView({ point, room, selected, pending, k, onPointerDown }: Props) {
  const p = electricPosition(point, room)
  const size = Math.max(ELECTRIC_KINDS[point.kind].size, 9 * k)  // na dálku zůstane čitelná
  const stroke = pending ? '#ff9800' : selected ? '#2f6fed' : '#222'
  const line = { stroke, strokeWidth: (selected || pending ? 2 : 1.2) * k, fill: '#fff' }
  const r = size / 2
  // rozvaděč se kreslí ve skutečných rozměrech (šířka × hloubka), jen na dálku nejméně jako čitelná značka
  const board = boardSize(point)
  const boardW = Math.max(board.w, size), boardD = Math.max(board.d, 8 * k)

  return (
    <g
      transform={`translate(${p.x} ${p.y}) rotate(${(p.rot * 180) / Math.PI})`}
      onPointerDown={onPointerDown} style={{ cursor: 'move' }}
    >
      {/* větší neviditelná plocha, ať se bod snadno chytí (kurzor přesunutí se ukáže hned u značky) */}
      <circle cx={0} cy={point.kind === 'light' ? 0 : r} r={Math.max(size, 10 * k)} fill="transparent" />
      <title>{point.name || ELECTRIC_KINDS[point.kind].label}</title>
      {point.kind === 'socket' && <circle cx={0} cy={r} r={r} {...line} />}
      {point.kind === 'socket-double' && (
        <>
          <circle cx={-r} cy={r} r={r} {...line} />
          <circle cx={r} cy={r} r={r} {...line} />
        </>
      )}
      {point.kind === 'switch' && (
        <>
          <circle cx={0} cy={r} r={r * 0.8} {...line} />
          <line x1={0} y1={r} x2={r * 0.9} y2={r * 1.9} stroke={stroke} strokeWidth={1.2 * k} />
        </>
      )}
      {point.kind === 'light' && (
        <>
          <circle cx={0} cy={0} r={r} {...line} />
          <line x1={-r * 0.7} y1={-r * 0.7} x2={r * 0.7} y2={r * 0.7} stroke={stroke} strokeWidth={1.2 * k} />
          <line x1={-r * 0.7} y1={r * 0.7} x2={r * 0.7} y2={-r * 0.7} stroke={stroke} strokeWidth={1.2 * k} />
        </>
      )}
      {point.kind === 'board' && (
        <>
          <rect x={-boardW / 2} y={0} width={boardW} height={boardD} {...line} />
          <text x={0} y={boardD / 2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(boardD, boardW) * 0.7}
            fill={stroke} pointerEvents="none">R</text>
        </>
      )}
    </g>
  )
}
