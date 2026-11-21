import type { PointerEvent } from 'react'
import { CABLE_TYPES } from '../../domain/electricCatalog'
import type { Cable } from '../../domain/types'
import type { Pos3 } from '../../geometry/electric'

interface Props {
  cable: Cable
  /** Celá trasa včetně koncových bodů (první a poslední bod jsou konce kabelu). */
  polyline: Pos3[]
  selected: boolean
  k: number
  onSelect: (e: PointerEvent) => void
  /** Začátek tažení mezilehlého bodu `index` (index v `cable.via`). */
  onWaypointPointerDown: (e: PointerEvent, index: number) => void
  /** Tažení za "+" uprostřed úseku vloží nový bod na pozici `index` v `cable.via`. */
  onInsertPointerDown: (e: PointerEvent, index: number, at: Pos3) => void
}

/** Kabel v půdorysu jako čárkovaná čára (vede ve zdi / stropě); vybraný má úchyty pro úpravu trasy. */
export function CableView({ cable, polyline, selected, k, onSelect, onWaypointPointerDown, onInsertPointerDown }: Props) {
  const points = polyline.map(p => `${p.x},${p.y}`).join(' ')
  const color = CABLE_TYPES[cable.type].color

  return (
    <g>
      {/* široká neviditelná čára usnadní trefení */}
      <polyline points={points} fill="none" stroke="transparent" strokeWidth={10 * k}
        style={{ cursor: 'pointer' }} onPointerDown={onSelect} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={(selected ? 3 : 2) * k}
        strokeDasharray={`${8 * k} ${4 * k}`} pointerEvents="none" />

      {selected && (
        <>
          {/* "+" uprostřed každého úseku: vloží nový bod trasy */}
          {polyline.slice(0, -1).map((a, i) => {
            const b = polyline[i + 1]
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
            if (Math.hypot(b.x - a.x, b.y - a.y) < 20) return null   // úsek bez půdorysné délky (svislý)
            return (
              <circle key={`m${i}`} cx={mid.x} cy={mid.y} r={4 * k} fill="#fff" stroke={color} strokeWidth={1.5 * k}
                strokeDasharray={`${2 * k}`} style={{ cursor: 'copy' }}
                onPointerDown={e => onInsertPointerDown(e, i, mid)} />
            )
          })}
          {cable.via.map((w, i) => (
            <circle key={`w${i}`} cx={w.x} cy={w.y} r={5 * k} fill={color} stroke="#fff" strokeWidth={1.5 * k}
              style={{ cursor: 'move' }} onPointerDown={e => onWaypointPointerDown(e, i)} />
          ))}
        </>
      )}
    </g>
  )
}
