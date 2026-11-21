import { useState } from 'react'
import { buildPlanSvg } from '../../report/planSvg'
import { downloadSvg, printPlan } from '../../report/printPlan'
import { selectProject, useProjectStore } from '../../store/projectStore'

const TITLE = 'Půdorys bytu'

/** Nabídka tisku půdorysu: co do výkresu dát a tisk / uložení do PDF nebo stažení SVG. */
export function PrintMenu() {
  const [open, setOpen] = useState(false)
  const [dimensions, setDimensions] = useState(true)
  const [furniture, setFurniture] = useState(true)
  const [electro, setElectro] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const build = () => buildPlanSvg(selectProject(useProjectStore.getState()), {
    dimensions, furniture, electro, title: TITLE, date: new Date().toLocaleDateString('cs-CZ'),
  })

  return (
    <div className="print-menu">
      <button onClick={() => setOpen(!open)} className={open ? 'active' : ''}>🖨 Tisk</button>
      {open && (
        <div className="print-popover">
          <label><input type="checkbox" checked={dimensions} onChange={e => setDimensions(e.target.checked)} /> Kóty (délky stěn, celkové rozměry)</label>
          <label><input type="checkbox" checked={furniture} onChange={e => setFurniture(e.target.checked)} /> Nábytek</label>
          <label><input type="checkbox" checked={electro} onChange={e => setElectro(e.target.checked)} /> Elektro (body a kabely)</label>
          <div className="row">
            <button onClick={() => setMessage(printPlan(build(), TITLE) ? null : 'Prohlížeč zablokoval okno pro tisk, povolte vyskakovací okna.')}>
              Tisk / PDF
            </button>
            <button onClick={() => downloadSvg(build(), 'pudorys.svg')}>Stáhnout SVG</button>
          </div>
          {message && <small className="error">{message}</small>}
          <small>Výkres je ve skutečném měřítku na A4. V dialogu tisku zvolte „Uložit jako PDF“.</small>
        </div>
      )}
    </div>
  )
}
