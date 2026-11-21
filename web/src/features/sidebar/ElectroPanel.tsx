import { useState } from 'react'
import { CABLE_TYPES, ELECTRIC_KINDS, kindsOf, lineTypesOf } from '../../domain/electricCatalog'
import type { CableType } from '../../domain/types'
import { beginGesture, endGesture } from '../../store/history'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { useTargetRoomId } from './useTargetRoomId'

/** Elektro: přidání zásuvek/světel/rozvaděče do vybrané místnosti a kreslení kabelů mezi body. */
export function ElectroPanel() {
  const targetRoomId = useTargetRoomId()
  const addElectric = useProjectStore(s => s.addElectric)
  const electricCount = useProjectStore(s => s.electric.filter(p => ELECTRIC_KINDS[p.kind].system === 'electro').length)
  const autoConnectAndRerouteAll = useProjectStore(s => s.autoConnectAndRerouteAll)
  const [result, setResult] = useState<string | null>(null)
  const { tool, cableStart, cableType, select, setTool, setCableStart, setCableType } = useUiStore()
  const drawingCable = tool === 'cable'

  return (
    <section>
      <h2>Elektro</h2>
      <div className="row">
        {kindsOf('electro').map(kind => (
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
          {lineTypesOf('electro').map(t => <option key={t} value={t}>{CABLE_TYPES[t].label}</option>)}
        </select>
      </label>
      <div className="row">
        <button className={drawingCable ? 'active' : ''}
          onClick={() => { setCableStart(null); setTool(drawingCable ? 'select' : 'cable') }}>
          🔌 Vést kabel
        </button>
        <button
          disabled={electricCount === 0}
          title="Napojí nenapojené body (vypínače na rozvaděč, světla na nejbližší vypínač, zásuvky k rozvaděči a řetězově) a přetrasuje všechny kabely; ruční úpravy tras zahodí"
          onClick={() => {
            beginGesture()                         // celé napojení a přetrasování je jeden krok v undo
            const { added, rerouted } = autoConnectAndRerouteAll()
            endGesture()
            setResult(`Napojeno nových kabelů: ${added}, přetrasováno: ${rerouted}.`)
          }}
        >
          Přetrasovat vše
        </button>
      </div>
      {result && <small>{result}</small>}
      {drawingCable && (
        <small>{cableStart ? 'Klikněte na koncový bod.' : 'Klikněte na počáteční bod (zásuvku, světlo, rozvaděč…).'} Trasa se vytvoří automaticky, pak ji můžete upravit.</small>
      )}
    </section>
  )
}
