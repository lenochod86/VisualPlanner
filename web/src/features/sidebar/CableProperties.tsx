import { CABLE_TYPES } from '../../domain/electricCatalog'
import type { Cable, CableType } from '../../domain/types'
import { cablePolyline, polylineLength } from '../../geometry/electric'
import { beginGesture, endGesture } from '../../store/history'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { NumberInput } from './NumberField'

/** Rezerva na ohyby a připojení, kterou se k délce trasy přičítá při objednávce (kabel se nakupuje s přídavkem). */
const RESERVE = 1.1

export function CableProperties({ cable }: { cable: Cable }) {
  const store = useProjectStore()
  const select = useUiStore(s => s.select)
  const polyline = cablePolyline(cable, store.electric, store.rooms)
  const length = polyline ? polylineLength(polyline) / 100 : 0   // v metrech
  const name = (id: string) => {
    const p = store.electric.find(x => x.id === id)
    return p ? (p.name || `bod ${store.electric.indexOf(p) + 1}`) : '?'
  }

  return (
    <section>
      <h2>Kabel</h2>
      <small>{name(cable.fromId)} → {name(cable.toId)}</small>
      <label className="field">Typ
        <select value={cable.type} onChange={e => store.updateCable(cable.id, { type: e.target.value as CableType })}>
          {(Object.keys(CABLE_TYPES) as CableType[]).map(t => <option key={t} value={t}>{CABLE_TYPES[t].label}</option>)}
        </select>
      </label>
      <label className="field">Okruh
        <input value={cable.circuit} onFocus={beginGesture} onBlur={endGesture}
          onChange={e => store.updateCable(cable.id, { circuit: e.target.value })} />
      </label>
      <div className="total"><span>Délka trasy</span><strong>{length.toFixed(2).replace('.', ',')} m</strong></div>
      <div className="total"><span>S rezervou 10 %</span><strong>{(length * RESERVE).toFixed(2).replace('.', ',')} m</strong></div>

      <h2>Body trasy (x, y, výška v cm)</h2>
      {cable.via.length === 0 && <small>Kabel vede přímo. Tažením za „+“ na trase v půdorysu přidáte bod.</small>}
      <div className="waypoints">
        {cable.via.map((w, i) => (
          <div key={i} className="waypoint-row">
            <span>{i + 1}.</span>
            <NumberInput value={w.x} onCommit={v => store.updateWaypoint(cable.id, i, { x: v })} />
            <NumberInput value={w.y} onCommit={v => store.updateWaypoint(cable.id, i, { y: v })} />
            <NumberInput value={w.z} onCommit={v => store.updateWaypoint(cable.id, i, { z: Math.max(0, v) })} />
            <button title="Smazat bod" onClick={() => store.deleteWaypoint(cable.id, i)}>✕</button>
          </div>
        ))}
      </div>

      <div className="row">
        <button onClick={() => store.rerouteCable(cable.id)} title="Zahodí ruční úpravy trasy">Přetrasovat automaticky</button>
        <button className="danger" onClick={() => { store.deleteCable(cable.id); select(null) }}>Smazat kabel</button>
      </div>
    </section>
  )
}
