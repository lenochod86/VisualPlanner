import { FLOOR_MATERIALS, PAINT_SWATCHES, floorColor, wallColor } from '../../domain/finishes'
import { WALL_MATERIALS } from '../../domain/materials'
import type { FloorMaterial, Room, WallMaterial } from '../../domain/types'
import { beginGesture, endGesture } from '../../store/history'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { NumberField } from './NumberField'
import { sideName } from './WallList'

/** Výběr barvy: rychlé vzorky a libovolná barva z palety prohlížeče (tažení po paletě je jeden krok zpět). */
function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="color-picker">
      <div className="swatches">
        {PAINT_SWATCHES.map(s => (
          <button
            key={s.color} className={`swatch-button ${s.color === value ? 'active' : ''}`}
            style={{ background: s.color }} title={s.label} onClick={() => onChange(s.color)}
          />
        ))}
      </div>
      <input type="color" value={value} title="Vlastní barva" onFocus={beginGesture} onBlur={endGesture}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

const WALL_MATERIAL_KEYS = Object.keys(WALL_MATERIALS) as WallMaterial[]

/** Povrchy vybrané místnosti: materiál a barva podlahy, materiál a barva stěn (všech i jednotlivých), výška obkladu. */
export function FinishPanel() {
  const selection = useUiStore(s => s.selection)
  const room = useProjectStore(s => (selection?.type === 'room' ? s.rooms.find(r => r.id === selection.id) : undefined))
  const updateRoom = useProjectStore(s => s.updateRoom)

  if (!room) {
    return (
      <section>
        <h2>Povrchy</h2>
        <small>Vyberte místnost kliknutím v půdorysu. Pak jí tady nastavíte barvu a materiál podlahy a stěn (obklad, dlažba, malba).</small>
      </section>
    )
  }

  const edges = room.pts.map((_, i) => i)
  const colors = edges.map(i => wallColor(room, i))
  const commonMaterial = new Set(room.wallMaterials).size === 1 ? room.wallMaterials[0] : null
  const commonColor = new Set(colors).size === 1 ? colors[0] : colors[0]
  const hasTile = room.wallMaterials.includes('tile')

  const setFloor = (floor: Room['floor']) => updateRoom(room.id, { floor })
  const setWallMaterial = (edge: number | 'all', material: WallMaterial) =>
    updateRoom(room.id, { wallMaterials: room.wallMaterials.map((m, i) => (edge === 'all' || edge === i ? material : m)) })
  const setWallColor = (edge: number | 'all', color: string | null) =>
    updateRoom(room.id, { wallColors: edges.map(i => (edge === 'all' || edge === i ? color : room.wallColors?.[i] ?? null)) })

  return (
    <section>
      <h2>Povrchy: {room.name}</h2>

      <button
        title="Podlaha dlažba, všechny stěny obklad do 2 m (koupelna, WC)"
        onClick={() => updateRoom(room.id, {
          floor: { material: 'tile' }, wallMaterials: room.wallMaterials.map((): WallMaterial => 'tile'),
          wallColors: undefined, tileHeight: 200,
        })}
      >
        Dlažba a obklad (koupelna, WC)
      </button>

      <h2>Podlaha</h2>
      <label className="field">Materiál
        <select
          value={room.floor?.material ?? 'none'}
          onChange={e => setFloor(e.target.value === 'none' ? undefined : { material: e.target.value as FloorMaterial })}
        >
          <option value="none">podle typu místnosti</option>
          {(Object.keys(FLOOR_MATERIALS) as FloorMaterial[]).map(m => <option key={m} value={m}>{FLOOR_MATERIALS[m].label}</option>)}
        </select>
      </label>
      <ColorPicker value={floorColor(room)} onChange={color => setFloor({ material: room.floor?.material ?? 'laminate', color })} />
      {room.floor?.color && <button onClick={() => setFloor({ material: room.floor!.material })}>Vrátit barvu materiálu</button>}

      <h2>Stěny (všechny)</h2>
      <label className="field">Materiál
        <select value={commonMaterial ?? 'mixed'} onChange={e => setWallMaterial('all', e.target.value as WallMaterial)}>
          {commonMaterial === null && <option value="mixed" disabled>různé (viz níže)</option>}
          {WALL_MATERIAL_KEYS.map(m => <option key={m} value={m}>{WALL_MATERIALS[m].label}</option>)}
        </select>
      </label>
      <ColorPicker value={commonColor} onChange={color => setWallColor('all', color)} />
      {room.wallColors?.some(c => c) && <button onClick={() => updateRoom(room.id, { wallColors: undefined })}>Vrátit barvy materiálů</button>}
      {hasTile && (
        <NumberField
          label="Obklad do výšky (cm)" value={room.tileHeight ?? 200}
          onCommit={v => updateRoom(room.id, { tileHeight: Math.min(Math.max(v, 10), room.height) })}
        />
      )}

      <h2>Jednotlivé stěny</h2>
      {edges.map(i => (
        <div key={i} className="finish-wall">
          <span>{i + 1}. {sideName(room, i)}</span>
          <select value={room.wallMaterials[i]} onChange={e => setWallMaterial(i, e.target.value as WallMaterial)}>
            {WALL_MATERIAL_KEYS.map(m => <option key={m} value={m}>{WALL_MATERIALS[m].label}</option>)}
          </select>
          <input
            type="color" value={colors[i]} title="Barva této stěny" onFocus={beginGesture} onBlur={endGesture}
            onChange={e => setWallColor(i, e.target.value)}
          />
          <button title="Vrátit barvu materiálu" disabled={!room.wallColors?.[i]} onClick={() => setWallColor(i, null)}>↺</button>
        </div>
      ))}
      <small>Materiál „Obklad“ sahá do zadané výšky, nad ním je omítka. Vlastní barva přebíjí barvu materiálu.</small>
    </section>
  )
}
