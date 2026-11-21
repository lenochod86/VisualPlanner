import { CABLE_TYPES, ELECTRIC_KINDS } from '../../domain/electricCatalog'
import type { CableType, ElectricKind } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'

/** Elektro: přidání zásuvek/světel/rozvaděče do vybrané místnosti a kreslení kabelů mezi body. */
export function ElectroPanel({ targetRoomId }: { targetRoomId: string | undefined }) {
  const addElectric = useProjectStore(s => s.addElectric)
  const cables = useProjectStore(s => s.cables)
  const rerouteAllCables = useProjectStore(s => s.rerouteAllCables)
  const { tool, cableStart, cableType, select, setTool, setCableStart, setCableType } = useUiStore()
  const drawingCable = tool === 'cable'

  return (
    <section>
      <h2>Elektro</h2>
      <div className="row">
        {(Object.keys(ELECTRIC_KINDS) as ElectricKind[]).map(kind => (
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

      <label className="field">Typ kabelu
        <select value={cableType} onChange={e => setCableType(e.target.value as CableType)}>
          {(Object.keys(CABLE_TYPES) as CableType[]).map(t => <option key={t} value={t}>{CABLE_TYPES[t].label}</option>)}
        </select>
      </label>
      <div className="row">
        <button className={drawingCable ? 'active' : ''}
          onClick={() => { setCableStart(null); setTool(drawingCable ? 'select' : 'cable') }}>
          🔌 Vést kabel
        </button>
        <button disabled={cables.length === 0} onClick={rerouteAllCables}
          title="Zahodí ruční úpravy a vytvoří všechny trasy znovu">Přetrasovat vše</button>
      </div>
      {drawingCable && (
        <small>{cableStart ? 'Klikněte na koncový bod.' : 'Klikněte na počáteční bod (zásuvku, světlo, rozvaděč…).'} Trasa se vytvoří automaticky, pak ji můžete upravit.</small>
      )}
    </section>
  )
}
