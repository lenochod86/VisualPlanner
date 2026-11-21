import { CEILING_TYPES } from '../../domain/materials'
import type { CeilingType, Room } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { NumberField } from './NumberField'

/** Druh stropu místnosti a u SDK podhledu jeho parametry (výška podhledu, rozteč profilů). */
export function CeilingFields({ room }: { room: Room }) {
  const updateRoom = useProjectStore(s => s.updateRoom)
  const { ceiling } = room
  const set = (patch: Partial<typeof ceiling>) => updateRoom(room.id, { ceiling: { ...ceiling, ...patch } })

  return (
    <>
      <label className="field">Strop
        <select value={ceiling.type} onChange={e => set({ type: e.target.value as CeilingType })}>
          {(Object.keys(CEILING_TYPES) as CeilingType[]).map(t => <option key={t} value={t}>{CEILING_TYPES[t]}</option>)}
        </select>
      </label>
      {ceiling.type === 'sdk' && (
        <>
          <NumberField label="Podhled pod stropem (cm)" value={ceiling.drop} onCommit={v => set({ drop: Math.min(Math.max(v, 3), room.height - 100) })} />
          <NumberField label="Rozteč profilů (cm)" value={ceiling.profileSpacing} onCommit={v => set({ profileSpacing: Math.min(Math.max(v, 20), 100) })} />
          <NumberField label="Příčné profily (cm)" value={ceiling.crossSpacing} onCommit={v => set({ crossSpacing: Math.min(Math.max(v, 30), 200) })} />
          <small>Rastr profilů uvidíte ve 3D po zapnutí „Strop: průhledný“ v panelu Zobrazení.</small>
        </>
      )}
    </>
  )
}
