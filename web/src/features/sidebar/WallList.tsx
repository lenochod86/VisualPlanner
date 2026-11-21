import { MAX_WALL, MIN_WALL } from '../../config'
import { WALL_MATERIALS } from '../../domain/materials'
import type { Room, WallMaterial, WallMode } from '../../domain/types'
import { edgeInfo } from '../../geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { useWallModel } from '../../store/useWallModel'
import { NumberInput } from './NumberField'

const WALL_MODES: Record<WallMode, string> = {
  auto: 'Automaticky',
  solid: 'Vždy plná',
  hidden: 'Skrytá',
}

/** Světová strana, na kterou stěna "kouká" (ven z místnosti). */
function sideName(room: Room, edge: number): string {
  const { outward } = edgeInfo(room.pts, edge)
  if (Math.abs(outward.x) > Math.abs(outward.y)) return outward.x > 0 ? 'pravá' : 'levá'
  return outward.y > 0 ? 'dolní' : 'horní'
}

/** Rozměry všech stěn vybrané místnosti: délka a tloušťka, obojí se dá přepsat. */
export function WallList({ room }: { room: Room }) {
  const rooms = useProjectStore(s => s.rooms)
  const setWallLength = useProjectStore(s => s.setWallLength)
  const setWallThickness = useProjectStore(s => s.setWallThickness)
  const updateRoom = useProjectStore(s => s.updateRoom)
  const setWallMode = useProjectStore(s => s.setWallMode)
  const setHoveredWall = useUiStore(s => s.setHoveredWall)
  const walls = useWallModel()

  const roomName = (id: string) => rooms.find(r => r.id === id)?.name ?? '?'

  return (
    <div className="wall-list" onMouseLeave={() => setHoveredWall(null)}>
      <div className="wall-head"><span>Stěna / materiál</span><span>Délka</span><span>Tloušťka</span></div>
      {room.pts.map((_, i) => {
        const { thickness, partners, visible } = walls.info(room.id, i)
        const sharedWith = [...new Set(partners.map(p => roomName(p.roomId)))]
        return (
          <div key={i} className="wall-row" onMouseEnter={() => setHoveredWall({ roomId: room.id, edge: i })}>
            <span>{i + 1}. {sideName(room, i)}</span>
            <NumberInput value={edgeInfo(room.pts, i).len} onCommit={v => setWallLength(room.id, i, v)} />
            <NumberInput value={thickness} onCommit={v => setWallThickness(room.id, i, v)} />
            <div className="wall-extra">
              <select value={room.wallMaterials[i]} title="Materiál zdi na straně této místnosti"
              onChange={e => updateRoom(room.id, { wallMaterials: room.wallMaterials.map((m, k) => (k === i ? e.target.value as WallMaterial : m)) })}>
              {(Object.keys(WALL_MATERIALS) as WallMaterial[]).map(m => <option key={m} value={m}>{WALL_MATERIALS[m].label}</option>)}
              </select>
              <select value={room.wallModes[i]} title="Zobrazení stěny" onChange={e => setWallMode(room.id, i, e.target.value as WallMode)}>
                {(Object.keys(WALL_MODES) as WallMode[]).map(m => <option key={m} value={m}>{WALL_MODES[m]}</option>)}
              </select>
            </div>
            {room.wallModes[i] === 'auto' && !visible && <small className="shared">skrytá: leží uvnitř jiné místnosti. Zvolte „Vždy plná“ pro zobrazení.</small>}
            {sharedWith.length > 0 && <small className="shared">sdílená zeď s: {sharedWith.join(', ')}</small>}
          </div>
        )
      })}
      <small>Rozměry v cm. Tloušťka {MIN_WALL}–{MAX_WALL}. U sdílené zdi zůstane její osa na místě; materiál platí pro polovinu zdi na straně této místnosti.</small>
    </div>
  )
}
