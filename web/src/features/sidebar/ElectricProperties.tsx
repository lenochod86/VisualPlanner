import { ELECTRIC_KINDS } from '../../domain/electricCatalog'
import type { ElectricPoint } from '../../domain/types'
import { beginGesture, endGesture } from '../../store/history'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { NumberField } from './NumberField'

export function ElectricProperties({ point }: { point: ElectricPoint }) {
  const updateElectric = useProjectStore(s => s.updateElectric)
  const deleteElectric = useProjectStore(s => s.deleteElectric)
  const cables = useProjectStore(s => s.cables)
  const { select, setTool, setCableStart } = useUiStore()
  const spec = ELECTRIC_KINDS[point.kind]
  const connected = cables.filter(c => c.fromId === point.id || c.toId === point.id)

  return (
    <section>
      <h2>{spec.label}</h2>
      <label className="field">Název
        <input value={point.name} placeholder="např. TV, lednice" onFocus={beginGesture} onBlur={endGesture}
          onChange={e => updateElectric(point.id, { name: e.target.value })} />
      </label>
      {spec.mount === 'wall'
        ? <NumberField label="Výška od podlahy (cm)" value={point.height} onCommit={v => updateElectric(point.id, { height: Math.max(0, v) })} />
        : <small>Světlo je na stropě (u SDK na desce podhledu).</small>}
      <small>Připojené kabely: {connected.length}</small>
      <div className="row">
        <button onClick={() => { setTool('cable'); setCableStart(point.id) }}>Vést kabel odsud…</button>
        <button className="danger" onClick={() => { deleteElectric(point.id); select(null) }}>Smazat</button>
      </div>
    </section>
  )
}
