import { ELECTRIC_KINDS } from '../../domain/electricCatalog'
import type { ElectricPoint } from '../../domain/types'
import { boardSize } from '../../geometry/electric'
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
  const isBoard = point.kind === 'board'
  const board = boardSize(point)

  return (
    <section>
      <h2>{spec.label}</h2>
      <label className="field">Název
        <input value={point.name} placeholder="např. TV, lednice" onFocus={beginGesture} onBlur={endGesture}
          onChange={e => updateElectric(point.id, { name: e.target.value })} />
      </label>

      {isBoard && (
        <>
          <NumberField label="Šířka (cm)" value={board.w} onCommit={v => updateElectric(point.id, { w: Math.max(10, v) })} />
          <NumberField label="Výška (cm)" value={board.h} onCommit={v => updateElectric(point.id, { h: Math.max(10, v) })} />
          <NumberField label="Hloubka (cm)" value={board.d} onCommit={v => updateElectric(point.id, { d: Math.max(2, v) })} />
        </>
      )}

      {spec.mount === 'wall'
        ? <NumberField
            label={isBoard ? 'Spodní hrana od podlahy (cm)' : 'Výška středu od podlahy (cm)'}
            value={point.height} onCommit={v => updateElectric(point.id, { height: Math.max(0, v) })} />
        : <small>Světlo je na stropě (u SDK na desce podhledu).</small>}
      {isBoard && <small>Kabely se do rozvaděče připojují na jeho horní hraně.</small>}

      <small>Připojené kabely: {connected.length}</small>
      <div className="row">
        <button onClick={() => { setTool('cable'); setCableStart(point.id) }}>Vést kabel odsud…</button>
        <button className="danger" onClick={() => { deleteElectric(point.id); select(null) }}>Smazat</button>
      </div>
    </section>
  )
}
