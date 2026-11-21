import { ROOM_TYPES } from '../../domain/catalog'
import type { Room, RoomType } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { NumberField } from './NumberField'

export function RoomProperties({ room }: { room: Room }) {
  const updateRoom = useProjectStore(s => s.updateRoom)
  const deleteRoom = useProjectStore(s => s.deleteRoom)
  const select = useUiStore(s => s.select)

  const changeType = (type: RoomType) => {
    // pokud měla místnost výchozí název podle typu, přejmenuje se spolu s ním
    const hadDefaultName = room.name === ROOM_TYPES[room.type].label
    updateRoom(room.id, { type, ...(hadDefaultName ? { name: ROOM_TYPES[type].label } : {}) })
  }

  return (
    <section>
      <h2>Vybraná místnost</h2>
      <label className="field">Název
        <input value={room.name} onChange={e => updateRoom(room.id, { name: e.target.value })} />
      </label>
      <label className="field">Typ
        <select value={room.type} onChange={e => changeType(e.target.value as RoomType)}>
          {(Object.keys(ROOM_TYPES) as RoomType[]).map(t => <option key={t} value={t}>{ROOM_TYPES[t].label}</option>)}
        </select>
      </label>
      <NumberField label="Tloušťka stěn (cm)" value={room.wallT} onChange={v => updateRoom(room.id, { wallT: Math.max(2, v) })} />
      <NumberField label="Výška (cm)" value={room.height} onChange={v => updateRoom(room.id, { height: Math.max(100, v) })} />
      <button className="danger" onClick={() => { deleteRoom(room.id); select(null) }}>Smazat místnost</button>
    </section>
  )
}
