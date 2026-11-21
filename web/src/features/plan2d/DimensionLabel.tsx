import type { PointerEvent } from 'react'
import type { Pt } from '../../domain/types'
import { edgeInfo } from '../../geometry/polygon'

/**
 * Neviditelný úchyt pro tažení stěny (změna rozměru potažením). Kreslí se pod nábytkem,
 * aby nezabíral nábytku stojícímu u zdi.
 */
export function EdgeHandle({ pts, edge, k, onDragStart }: {
  pts: Pt[]
  edge: number
  k: number
  onDragStart: (e: PointerEvent) => void
}) {
  const e = edgeInfo(pts, edge)
  return (
    <line
      x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
      stroke="transparent" strokeWidth={14 * k}
      style={{ cursor: e.horizontal ? 'ns-resize' : 'ew-resize' }}
      onPointerDown={onDragStart}
    />
  )
}

/** Číslo s délkou stěny vždy uvnitř místnosti u dané stěny; klik = ruční zadání rozměru. Kreslí se nad nábytkem. */
export function DimensionText({ pts, edge, k, onEdit }: {
  pts: Pt[]
  edge: number
  k: number
  /** Klik = ruční zadání rozměru; bez něj je kóta jen na čtení (mimo záložku Půdorys). */
  onEdit?: () => void
}) {
  const e = edgeInfo(pts, edge)
  const mid = { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 }
  const offset = 14 * k  // popisek uvnitř, aby se u sousedících místností nepřekrývaly
  return (
    <text
      x={mid.x + e.inward.x * offset} y={mid.y + e.inward.y * offset}
      textAnchor="middle" dominantBaseline="middle" fontSize={12 * k}
      fill="#2f6fed" stroke="#ffffffcc" strokeWidth={3 * k} paintOrder="stroke"
      style={{ cursor: onEdit ? 'text' : 'default' }}
      pointerEvents={onEdit ? undefined : 'none'}
      onPointerDown={onEdit ? (ev => { ev.stopPropagation(); onEdit() }) : undefined}
    >
      {Math.round(e.len)}
    </text>
  )
}
