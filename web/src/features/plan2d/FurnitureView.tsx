import type { PointerEvent } from 'react'
import { FURNITURE_KINDS } from '../../domain/furnitureCatalog'
import type { Furniture, Room } from '../../domain/types'
import { resolvePlacement } from '../../geometry/placement'
import type { WallModel } from '../../geometry/walls'

interface Props {
  furniture: Furniture
  room: Room
  walls: WallModel
  selected: boolean
  /** Má kolizi (přesah do zdi, překrytí…)? Kreslí se červeně. */
  issue: boolean
  k: number
  onPointerDown: (e: PointerEvent) => void
}

/** Symbol nábytku v půdorysu: obdélník s tmavším pruhem na zadní straně (u zdi) a názvem. */
export function FurnitureView({ furniture, room, walls, selected, issue, k, onPointerDown }: Props) {
  const spec = FURNITURE_KINDS[furniture.kind]
  const p = resolvePlacement(furniture, room, walls)
  const { w, d } = furniture
  const look = {
    fill: issue ? '#f8c9c6' : spec.color,
    stroke: selected ? '#2f6fed' : issue ? '#d32f2f' : '#555',
    strokeWidth: (selected || issue ? 2 : 1) * k,
  }
  const showLabel = Math.min(w, d) / k > 28   // na malé ploše název jen překáží

  return (
    <g onPointerDown={onPointerDown} style={{ cursor: 'grab' }}>
      <g transform={`translate(${p.x} ${p.y}) rotate(${(p.rot * 180) / Math.PI})`}>
        {spec.round
          // květiny a podobné: kruh (elipsa šířka × hloubka)
          ? <ellipse cx={0} cy={0} rx={w / 2} ry={d / 2} {...look} />
          : (
            <>
              <rect x={-w / 2} y={-d / 2} width={w} height={d} {...look} />
              <rect x={-w / 2} y={-d / 2} width={w} height={Math.min(8, d * 0.2)} fill="#0003" pointerEvents="none" />
            </>
          )}
      </g>
      {showLabel && (
        <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={11 * k}
          fill="#333" pointerEvents="none">{spec.label}</text>
      )}
    </g>
  )
}
