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
/** Sporák (čtyři hořáky) a dřez (miska a kapací plocha) na kuchyňské lince; polohy odpovídají 3D modelu. */
function KitchenSymbols({ w, d, k }: { w: number; d: number; k: number }) {
  const x = (f: number) => -w / 2 + f * w, y = (f: number) => -d / 2 + f * d
  const burner = Math.min(w * 0.06, d * 0.24) / 2
  return (
    <g pointerEvents="none">
      <rect x={x(0.1)} y={y(0.12)} width={w * 0.25} height={d * 0.76} fill="#2b2e32" stroke="#111" strokeWidth={1 * k} />
      {[0.1625, 0.2875].flatMap(cx => [0.32, 0.68].map(cy => (
        <circle key={`${cx}-${cy}`} cx={x(cx)} cy={y(cy)} r={burner} fill="none" stroke="#cfd3d8" strokeWidth={1.2 * k} />
      )))}
      <rect x={x(0.58)} y={y(0.08)} width={w * 0.34} height={d * 0.84} fill="#dde1e5" stroke="#777" strokeWidth={1 * k} />
      <rect x={x(0.6)} y={y(0.18)} width={w * 0.12} height={d * 0.64} fill="#aab1b8" stroke="#444" strokeWidth={1 * k} />
      {[0.78, 0.81, 0.84, 0.87].map(gx => <line key={gx} x1={x(gx)} y1={y(0.15)} x2={x(gx)} y2={y(0.85)} stroke="#9aa1a8" strokeWidth={0.8 * k} />)}
    </g>
  )
}

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
        {furniture.kind === 'kitchen-unit' && <KitchenSymbols w={w} d={d} k={k} />}
      </g>
      {showLabel && (
        <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={11 * k}
          fill="#333" pointerEvents="none">{spec.label}</text>
      )}
    </g>
  )
}
