import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { ObstacleKind, RoomShape } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'

const SHAPES: { shape: RoomShape; label: string }[] = [
  { shape: 'rect', label: 'Obdélník' },
  { shape: 'L-left', label: 'L levé' },
  { shape: 'L-right', label: 'L pravé' },
]

/** Přidávání místností (kreslením nebo hotovým tvarem) a překážek do vybrané místnosti. */
export function AddPanel() {
  const rooms = useProjectStore(s => s.rooms)
  const obstacles = useProjectStore(s => s.obstacles)
  const addRoom = useProjectStore(s => s.addRoom)
  const addObstacle = useProjectStore(s => s.addObstacle)
  const { selection, tool, select, setTool } = useUiStore()

  // Překážka jde do vybrané místnosti (nebo do místnosti vybrané překážky), jinak do první.
  const selectedObstacle = selection?.type === 'obstacle' ? obstacles.find(o => o.id === selection.id) : undefined
  const targetRoomId = selection?.type === 'room' ? selection.id : selectedObstacle?.roomId ?? rooms[0]?.id

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
        <h2>Překážky</h2>
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
