import { useState } from 'react'
import { ELECTRIC_KINDS, systemOfPoint } from '../../domain/electricCatalog'
import type { ElectricPoint } from '../../domain/types'
import { boardSize } from '../../geometry/electric'
import { beginGesture, endGesture } from '../../store/history'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { NumberField } from './NumberField'

export function ElectricProperties({ point }: { point: ElectricPoint }) {
  const updateElectric = useProjectStore(s => s.updateElectric)
  const deleteElectric = useProjectStore(s => s.deleteElectric)
  const autoConnectPoint = useProjectStore(s => s.autoConnectPoint)
  const setSnapToWalls = useProjectStore(s => s.setElectricSnapToWalls)
  const [result, setResult] = useState<string | null>(null)
  const cables = useProjectStore(s => s.cables)
  const { select, setTool, setCableStart } = useUiStore()
  const spec = ELECTRIC_KINDS[point.kind]
  const connected = cables.filter(c => c.fromId === point.id || c.toId === point.id)
  const plumbing = systemOfPoint(point.kind) === 'plumbing'
  const isBoard = point.kind === 'board'
  const board = boardSize(point)

  return (
    <section>
      <h2>{spec.label}</h2>
      <label className="field">Název
        <input value={point.name} placeholder={plumbing ? 'např. umyvadlo, vana' : 'např. TV, lednice'} onFocus={beginGesture} onBlur={endGesture}
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
      {plumbing && (
        <>
          <label className="check">
            <input type="checkbox" checked={point.snapToWalls !== false} onChange={e => setSnapToWalls(point.id, e.target.checked)} />
            Přichytit ke zdi
          </label>
          <small>
            {point.attach ? 'Je na zdi a drží se jí při změně rozměrů místnosti.'
              : point.snapToWalls === false ? 'Stojí volně v místnosti a ke zdi se nepřichytává.' : 'Stojí volně; při tažení ke zdi se přichytí.'}
          </small>
        </>
      )}
      {isBoard && <small>Kabely se do rozvaděče připojují na jeho horní hraně.</small>}

      <small>{plumbing ? 'Připojené potrubí' : 'Připojené kabely'}: {connected.length}</small>
      {!plumbing && <button
        title={connected.length === 0
          ? 'Napojí bod podle pravidel (vypínač na rozvaděč, světlo na nejbližší vypínač, zásuvku v místnosti na rozvaděč nebo řetězově) a vytvoří trasu'
          : "Znovu automaticky vytvoří trasy kabelů tohoto bodu; ruční úpravy těchto tras zahodí"}
        onClick={() => {
          beginGesture()                         // jeden krok v undo
          const { added, rerouted } = autoConnectPoint(point.id)
          endGesture()
          setResult(added === 0 && rerouted === 0 ? "Není kam napojit (chybí rozvaděč, vypínač nebo jiná zásuvka v místnosti)." : `Napojeno nových kabelů: ${added}, přetrasováno: ${rerouted}.`)
        }}
      >
        {connected.length === 0 ? "Napojit automaticky" : "Přetrasovat automaticky"}
      </button>}
      {!plumbing && result && <small>{result}</small>}
      <div className="row">
        <button onClick={() => { setTool('cable'); setCableStart(point.id) }}>{plumbing ? 'Vést potrubí odsud…' : 'Vést kabel odsud…'}</button>
        <button className="danger" onClick={() => { deleteElectric(point.id); select(null) }}>Smazat</button>
      </div>
    </section>
  )
}
