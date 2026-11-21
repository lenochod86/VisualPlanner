import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { ObstacleKind, RoomShape } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { useTargetRoomId } from './useTargetRoomId'

const SHAPES: { shape: RoomShape; label: string }[] = [
  { shape: 'rect', label: 'Obdélník' },
  { shape: 'L-left', label: 'L levé' },
  { shape: 'L-right', label: 'L pravé' },
]

/** Záložka Půdorys: přidávání místností (kreslením nebo hotovým tvarem) a stavebních prvků (okna, dveře…). */
export function RoomsPanel() {
  const addRoom = useProjectStore(s => s.addRoom)
  const addObstacle = useProjectStore(s => s.addObstacle)
  const { tool, select, setTool } = useUiStore()
  const targetRoomId = useTargetRoomId()

  return (
    <>
      <section>
        <h2>Místnosti</h2>
        <button className={tool === 'draw' ? 'active' : ''} onClick={() => setTool(tool === 'draw' ? 'select' : 'draw')}>
          ✏ Nakreslit místnost
        </button>
        <small>Tažením myši na plátně. Přitáhne se k sousedním místnostem.</small>
        <div className="row">
          {SHAPES.map(({ shape, label }) => (
            <button key={shape} onClick={() => select({ type: 'room', id: addRoom(shape) })}>{label}</button>
          ))}
        </div>
      </section>

      <section>
        <h2>Stavební prvky</h2>
        <div className="row">
          {(Object.keys(OBSTACLE_KINDS) as ObstacleKind[]).map(kind => (
            <button
              key={kind} disabled={!targetRoomId}
              onClick={() => {
                const id = targetRoomId && addObstacle(kind, targetRoomId)
                if (id) select({ type: 'obstacle', id })
              }}
            >
              {OBSTACLE_KINDS[kind].label}
            </button>
          ))}
        </div>
        <small>Přidá se do vybrané místnosti.</small>
      </section>
    </>
  )
}
