import type { PointerEvent } from 'react'
import type { Pt } from '../../domain/types'
import { edgeInfo } from '../../geometry/polygon'

interface Props {
  pts: Pt[]
  edge: number
  k: number
  /** Začátek tažení stěny (změna rozměru potažením). */
  onDragStart: (e: PointerEvent) => void
  /** Klik na číslo = ruční zadání rozměru. */
  onEdit: () => void
}

/** Neviditelný úchyt pro tažení stěny + číslo s délkou vždy uvnitř místnosti u dané stěny. */
export function DimensionLabel({ pts, edge, k, onDragStart, onEdit }: Props) {
  const e = edgeInfo(pts, edge)
  const mid = { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 }
  const offset = 14 * k  // popisek uvnitř, aby se u sousedících místností nepřekrývaly
  return (
    <g>
      <line
        x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
        stroke="transparent" strokeWidth={14 * k}
        style={{ cursor: e.horizontal ? 'ns-resize' : 'ew-resize' }}
        onPointerDown={onDragStart}
      />
      <text
        x={mid.x + e.inward.x * offset} y={mid.y + e.inward.y * offset}
        textAnchor="middle" dominantBaseline="middle" fontSize={12 * k}
        fill="#2f6fed" stroke="#ffffffcc" strokeWidth={3 * k} paintOrder="stroke"
        style={{ cursor: 'text' }}
        onPointerDown={ev => { ev.stopPropagation(); onEdit() }}
      >
        {Math.round(e.len)}
      </text>
    </g>
  )
}
