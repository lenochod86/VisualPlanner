import { CABLE_TYPES, ELECTRIC_KINDS, kindsOf, lineTypesOf } from '../../domain/electricCatalog'
import type { PipeType } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { useTargetRoomId } from './useTargetRoomId'

/** Vodoinstalace: přidání výtoků, odpadů, přípojky a ohřívače do vybrané místnosti a vedení potrubí mezi body. */
export function PlumbingPanel() {
  const targetRoomId = useTargetRoomId()
  const addElectric = useProjectStore(s => s.addElectric)
  const { tool, cableStart, pipeType, select, setTool, setCableStart, setPipeType } = useUiStore()
  const drawing = tool === 'cable'

  return (
    <section>
      <h2>Vodoinstalace</h2>
      <div className="row">
        {kindsOf('plumbing').map(kind => (
          <button
            key={kind} disabled={!targetRoomId}
            onClick={() => {
              const id = targetRoomId && addElectric(kind, targetRoomId)
              if (id) select({ type: 'electric', id })
            }}
          >
            {ELECTRIC_KINDS[kind].label}
          </button>
        ))}
      </div>
      <small>Přidá se do vybrané místnosti; tažením přichytíte ke zdi.</small>

      <label className="field">Typ potrubí
        <select value={pipeType} onChange={e => setPipeType(e.target.value as PipeType)}>
          {lineTypesOf('plumbing').map(t => <option key={t} value={t}>{CABLE_TYPES[t].label}</option>)}
        </select>
      </label>
      <div className="row">
        <button className={drawing ? 'active' : ''} onClick={() => { setCableStart(null); setTool(drawing ? 'select' : 'cable') }}>
          🚰 Vést potrubí
        </button>
      </div>
      {drawing && (
        <small>
          {cableStart ? 'Klikněte na koncový bod.' : 'Klikněte na počáteční bod (přípojka, ohřívač, výtok, odpad…).'} Trasa se vytvoří automaticky
          při podlaze, pak ji můžete upravit. Studená a teplá voda vede z přípojky a ohřívače k výtokům, odpad od výtoku k odpadní stoupačce.
        </small>
      )}
    </section>
  )
}
