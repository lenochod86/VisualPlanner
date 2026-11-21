import { ROOM_TYPES } from '../../domain/catalog'
import { WALL_MATERIALS } from '../../domain/materials'
import type { Room, RoomType, WallMaterial } from '../../domain/types'
import { formatAreaM2 } from '../../format'
import { polygonArea } from '../../geometry/polygon'
import { beginGesture, endGesture } from '../../store/history'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { CeilingFields } from './CeilingFields'
import { NumberField } from './NumberField'
import { WallList } from './WallList'

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
      <h2>Vybraná místnost · {formatAreaM2(polygonArea(room.pts))}</h2>
      <label className="field">Název
        {/* psaní názvu = jeden krok v undo, ne jeden za písmeno */}
        <input value={room.name} onFocus={beginGesture} onBlur={endGesture}
          onChange={e => updateRoom(room.id, { name: e.target.value })} />
      </label>
      <label className="field">Typ
        <select value={room.type} onChange={e => changeType(e.target.value as RoomType)}>
          {(Object.keys(ROOM_TYPES) as RoomType[]).map(t => <option key={t} value={t}>{ROOM_TYPES[t].label}</option>)}
        </select>
      </label>
      <NumberField label="Výška (cm)" value={room.height} onCommit={v => updateRoom(room.id, { height: Math.max(100, v) })} />

      <label className="field">Materiál stěn
        <select value={room.wallMaterial} onChange={e => updateRoom(room.id, { wallMaterial: e.target.value as WallMaterial })}>
          {(Object.keys(WALL_MATERIALS) as WallMaterial[]).map(m => <option key={m} value={m}>{WALL_MATERIALS[m].label}</option>)}
        </select>
      </label>
      <CeilingFields room={room} />

      <h2>Stěny</h2>
      <WallList room={room} />

      <button className="danger" onClick={() => { deleteRoom(room.id); select(null) }}>Smazat místnost</button>
    </section>
  )
}
