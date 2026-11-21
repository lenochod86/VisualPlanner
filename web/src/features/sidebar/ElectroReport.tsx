import { useMemo } from 'react'
import { CABLE_TYPES, ELECTRIC_KINDS, kindsOf, systemOfLine, systemOfPoint, type System } from '../../domain/electricCatalog'
import { buildElectricReport, reportToCsv } from '../../report/electricReport'
import { useProjectStore } from '../../store/projectStore'

const meters = (n: number) => n.toFixed(1).replace('.', ',')

function download(filename: string, content: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

/** Soupis instalace (elektro nebo voda): kolik čeho je, kolik metrů vedení a po okruzích / rozvodech. Export do CSV (Excel). */
export function ElectroReport({ system = 'electro' }: { system?: System }) {
  const plumbing = system === 'plumbing'
  const kinds = kindsOf(system)
  const rooms = useProjectStore(s => s.rooms)
  const electric = useProjectStore(s => s.electric)
  const cables = useProjectStore(s => s.cables)
  const report = useMemo(() => buildElectricReport({ rooms, electric, cables }, system), [rooms, electric, cables, system])

  if (!electric.some(p => systemOfPoint(p.kind) === system) && !cables.some(c => systemOfLine(c.type) === system)) return null

  return (
    <section>
      <h2>Soupis</h2>

      <div className="report-counts">
        {kinds.filter(k => report.totals[k] > 0).map(k => (
          <span key={k}>{ELECTRIC_KINDS[k].label}: <strong>{report.totals[k]}</strong></span>
        ))}
      </div>

      {report.circuits.length > 0 && (
        <table className="report-table">
          <thead><tr><th>{plumbing ? 'Rozvod' : 'Okruh'}</th><th>{plumbing ? 'Úseků' : 'Kabelů'}</th><th>Délka</th></tr></thead>
          <tbody>
            {report.circuits.map(c => (
              <tr key={c.circuit} title={c.types.map(t => CABLE_TYPES[t].label).join(', ')}>
                <td>{c.circuit}</td><td>{c.cables}</td><td>{meters(c.lengthM)} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {report.types.length > 0 && (
        <table className="report-table">
          <thead><tr><th>{plumbing ? 'Potrubí' : 'Kabel'}</th><th>Trasa</th><th>Koupit</th></tr></thead>
          <tbody>
            {report.types.map(t => (
              <tr key={t.type}>
                <td>{CABLE_TYPES[t.type].label.split(' (')[0]}</td>
                <td>{meters(t.lengthM)} m</td><td>{t.orderM} m</td>
              </tr>
            ))}
            <tr className="total-row"><td>Celkem</td><td>{meters(report.totalLengthM)} m</td><td /></tr>
          </tbody>
        </table>
      )}

      <small>„Koupit“ = trasa + 10 % rezerva, zaokrouhleno nahoru.</small>
      <button onClick={() => download(plumbing ? 'vodoinstalace-soupis.csv' : 'elektro-soupis.csv', reportToCsv(report))}>Exportovat CSV</button>
    </section>
  )
}
