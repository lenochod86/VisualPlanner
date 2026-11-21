import type { DimLine } from '../../geometry/distances'

/** Kóty vzdáleností (cm) u vybraného elektro bodu: úsečka se zarážkami na koncích a číslem uprostřed. */
export function DistanceDims({ lines, k }: { lines: DimLine[]; k: number }) {
  return (
    <g pointerEvents="none">
      {lines.map((l, i) => {
        const dx = (l.b.x - l.a.x) / l.length, dy = (l.b.y - l.a.y) / l.length
        const tick = 4 * k                       // zarážka kolmo na úsečku
        const mid = { x: (l.a.x + l.b.x) / 2, y: (l.a.y + l.b.y) / 2 }
        return (
          <g key={i} stroke="#d81b60" strokeWidth={1.2 * k}>
            <line x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} />
            {[l.a, l.b].map((p, j) => (
              <line key={j} x1={p.x - dy * tick} y1={p.y + dx * tick} x2={p.x + dy * tick} y2={p.y - dx * tick} />
            ))}
            <text x={mid.x} y={mid.y - 5 * k} textAnchor="middle" fontSize={11 * k} fontWeight={600}
              fill="#d81b60" stroke="#ffffffe6" strokeWidth={3 * k} paintOrder="stroke">
              {Math.round(l.length)}
            </text>
          </g>
        )
      })}
    </g>
  )
}
