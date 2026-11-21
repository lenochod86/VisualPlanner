import { ROOM_TYPES } from '../../domain/catalog'
import { formatAreaM2 } from '../../format'
import { polygonArea } from '../../geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'

/** Přehled bytu: seznam místností s plochou a celková plocha. */
export function FlatSummary() {
  const rooms = useProjectStore(s => s.rooms)
  const selection = useUiStore(s => s.selection)
  const select = useUiStore(s => s.select)
  const total = rooms.reduce((sum, r) => sum + polygonArea(r.pts), 0)

  return (
    <section>
      <h2>Byt</h2>
      <ul className="room-list">
        {rooms.map(room => (
          <li key={room.id}>
            <button
              className={selection?.type === 'room' && selection.id === room.id ? 'active' : ''}
              onClick={() => select({ type: 'room', id: room.id })}
            >
              <span className="swatch" style={{ background: ROOM_TYPES[room.type].color }} />
              <span className="grow">{room.name}</span>
              <span>{formatAreaM2(polygonArea(room.pts))}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="total"><span>Užitná plocha</span><strong>{formatAreaM2(total)}</strong></div>
    </section>
  )
}
