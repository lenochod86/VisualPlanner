import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { availablePages, buildPlanPages, pageTitle, type PageKind } from '../../report/planSvg'
import { downloadSvgPages, printPlan } from '../../report/printPlan'
import { selectProject, useProjectStore } from '../../store/projectStore'

const TITLE = 'Byt'

const PAGE_HINTS: Record<PageKind, string> = {
  plan: 'zdi, okna, dveře, názvy místností a kóty',
  equipment: 'nábytek a sanita, bez kót a názvů místností',
  electro: 'zásuvky, světla, rozvaděč a kabely',
  plumbing: 'výtoky, odpady, přípojka, ohřívač a potrubí',
  summary: 'soupis elektra, vodoinstalace a SDK profilů (CD, UD) s metrážemi',
}

/** Nabídka tisku: každá stránka (půdorys, vybavení, elektro) je samostatná. Tisk / PDF nebo stažení SVG. */
export function PrintMenu() {
  const [open, setOpen] = useState(false)
  const [excluded, setExcluded] = useState<PageKind[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const project = useProjectStore(useShallow(s => ({ rooms: s.rooms, furniture: s.furniture, electric: s.electric, cables: s.cables })))

  const available = availablePages(project)
  const chosen = available.filter(k => !excluded.includes(k))
  const toggle = (kind: PageKind) => setExcluded(e => (e.includes(kind) ? e.filter(k => k !== kind) : [...e, kind]))

  const build = () => buildPlanPages(selectProject(useProjectStore.getState()), {
    title: TITLE, date: new Date().toLocaleDateString('cs-CZ'),
  }, chosen)

  return (
    <div className="print-menu">
      <button onClick={() => setOpen(!open)} className={open ? 'active' : ''}>🖨 Tisk</button>
      {open && (
        <div className="print-popover">
          <strong>Stránky</strong>
          {(['plan', 'equipment', 'electro', 'plumbing', 'summary'] as PageKind[]).map(kind => {
            const exists = available.includes(kind)
            return (
              <label key={kind} className={exists ? '' : 'disabled'}>
                <input type="checkbox" disabled={!exists} checked={exists && !excluded.includes(kind)} onChange={() => toggle(kind)} />
                <span><b>{pageTitle(kind)}</b> <small>{exists ? PAGE_HINTS[kind] : 'zatím nic k vytištění'}</small></span>
              </label>
            )
          })}
          <div className="row">
            <button disabled={chosen.length === 0}
              onClick={() => setMessage(printPlan(build(), TITLE) ? null : 'Prohlížeč zablokoval okno pro tisk, povolte vyskakovací okna.')}>
              Tisk / PDF ({chosen.length} {chosen.length === 1 ? 'strana' : chosen.length < 5 ? 'strany' : 'stran'})
            </button>
            <button disabled={chosen.length === 0} onClick={() => downloadSvgPages(build(), 'byt')}>Stáhnout SVG</button>
          </div>
          {message && <small className="error">{message}</small>}
          <small>Všechny stránky jsou ve stejném měřítku na A4. V dialogu tisku zvolte „Uložit jako PDF“, okraje „Žádné“, měřítko 100 % a orientaci podle výkresu (na šířku pro široký byt).</small>
        </div>
      )}
    </div>
  )
}

