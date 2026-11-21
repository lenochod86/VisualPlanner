import { MAX_WALL, MIN_WALL } from '../../config'
import type { Room } from '../../domain/types'
import { edgeInfo } from '../../geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { useWallModel } from '../../store/useWallModel'
import { NumberInput } from './NumberField'

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
  const setHoveredWall = useUiStore(s => s.setHoveredWall)
  const walls = useWallModel()

  const roomName = (id: string) => rooms.find(r => r.id === id)?.name ?? '?'

  return (
    <div className="wall-list" onMouseLeave={() => setHoveredWall(null)}>
      <div className="wall-head"><span>Stěna</span><span>Délka</span><span>Tloušťka</span></div>
      {room.pts.map((_, i) => {
        const { thickness, partners } = walls.info(room.id, i)
        const sharedWith = [...new Set(partners.map(p => roomName(p.roomId)))]
        return (
          <div key={i} className="wall-row" onMouseEnter={() => setHoveredWall({ roomId: room.id, edge: i })}>
            <span>{i + 1}. {sideName(room, i)}</span>
            <NumberInput value={edgeInfo(room.pts, i).len} onCommit={v => setWallLength(room.id, i, v)} />
            <NumberInput value={thickness} onCommit={v => setWallThickness(room.id, i, v)} />
            {sharedWith.length > 0 && <small className="shared">sdílená zeď s: {sharedWith.join(', ')}</small>}
          </div>
        )
      })}
      <small>Rozměry v cm. Tloušťka {MIN_WALL}–{MAX_WALL}. U sdílené zdi zůstane její osa na místě.</small>
    </div>
  )
}
