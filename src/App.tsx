import { useStore } from './store'
import { Plan2D } from './Plan2D'
import { View3D } from './View3D'
import { OBS_KINDS, ROOM_TYPES } from './constants'
import type { ObsKind, RoomType } from './types'

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">{label}
      <input type="number" value={Math.round(value)} onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v) }} />
    </label>
  )
}

function Sidebar() {
  const s = useStore()
  const room = s.selection?.type === 'room' ? s.rooms.find(r => r.id === s.selection!.id) : undefined
  const obs = s.selection?.type === 'obs' ? s.obstacles.find(o => o.id === s.selection!.id) : undefined
  const targetRoom = room?.id ?? (obs ? obs.roomId : s.rooms[0]?.id)

  return (
    <aside className="sidebar">
      <h1>Visual Planner</h1>
      <section>
        <h2>Přidat místnost</h2>
        <div className="row">
          <button onClick={() => s.addRoom('rect')}>▭ Obdélník</button>
          <button onClick={() => s.addRoom('L-left')}>L levé</button>
          <button onClick={() => s.addRoom('L-right')}>L pravé</button>
        </div>
      </section>
      <section>
        <h2>Přidat překážku</h2>
        <div className="row">
          {(Object.keys(OBS_KINDS) as ObsKind[]).map(k => (
            <button key={k} disabled={!targetRoom} onClick={() => targetRoom && s.addObstacle(k, targetRoom)}>{OBS_KINDS[k].label}</button>
          ))}
        </div>
        <small>Přidá se do vybrané místnosti.</small>
      </section>
      <section>
        <h2>3D zobrazení</h2>
        <label className="field">Průhlednost zdí
          <input type="range" min={0.1} max={1} step={0.05} value={s.wallOpacity} onChange={e => s.setWallOpacity(parseFloat(e.target.value))} />
        </label>
      </section>

      {room && (
        <section>
          <h2>Místnost</h2>
          <label className="field">Název
            <input value={room.name} onChange={e => s.updateRoom(room.id, { name: e.target.value })} />
          </label>
          <label className="field">Typ
            <select value={room.type} onChange={e => {
              const type = e.target.value as RoomType
              const wasDefault = room.name === ROOM_TYPES[room.type].label
              s.updateRoom(room.id, { type, ...(wasDefault ? { name: ROOM_TYPES[type].label } : {}) })
            }}>
              {(Object.keys(ROOM_TYPES) as RoomType[]).map(t => <option key={t} value={t}>{ROOM_TYPES[t].label}</option>)}
            </select>
          </label>
          <Num label="Tloušťka stěn (cm)" value={room.wallT} onChange={v => s.updateRoom(room.id, { wallT: Math.max(2, v) })} />
          <Num label="Výška (cm)" value={room.height} onChange={v => s.updateRoom(room.id, { height: Math.max(100, v) })} />
          <button className="danger" onClick={() => s.deleteRoom(room.id)}>Smazat místnost</button>
        </section>
      )}

      {obs && (
        <section>
          <h2>{OBS_KINDS[obs.kind].label}</h2>
          <Num label="Šířka (cm)" value={obs.w} onChange={v => s.updateObstacle(obs.id, { w: Math.max(5, v) })} />
          <Num label="Hloubka (cm)" value={obs.d} onChange={v => s.updateObstacle(obs.id, { d: Math.max(2, v) })} />
          <Num label="Výška (cm)" value={obs.h} onChange={v => s.updateObstacle(obs.id, { h: Math.max(5, v) })} />
          <Num label="Od podlahy (cm)" value={obs.elev} onChange={v => s.updateObstacle(obs.id, { elev: Math.max(0, v) })} />
          <button className="danger" onClick={() => s.deleteObstacle(obs.id)}>Smazat</button>
        </section>
      )}
      <small className="hint">Táhni stěnu = změna rozměru. Klik na číslo = zadání rozměru. Kolečko = zoom, tažení pozadí = posun.</small>
    </aside>
  )
}

export function App() {
  return (
    <div className="app">
      <Sidebar />
      <main>
        <div className="pane"><div className="pane-title">Půdorys</div><Plan2D /></div>
        <div className="pane"><div className="pane-title">3D</div><View3D /></div>
      </main>
    </div>
  )
}
