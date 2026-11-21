import { OBSTACLE_KINDS } from '../../domain/catalog'
import { FURNITURE_CATEGORIES, FURNITURE_KINDS, type FurnitureCategory } from '../../domain/furnitureCatalog'
import type { FurnitureKind, ObstacleKind, RoomShape } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { ElectroPanel } from './ElectroPanel'

const SHAPES: { shape: RoomShape; label: string }[] = [
  { shape: 'rect', label: 'Obdélník' },
  { shape: 'L-left', label: 'L levé' },
  { shape: 'L-right', label: 'L pravé' },
]

const furnitureByCategory = (category: FurnitureCategory) =>
  (Object.keys(FURNITURE_KINDS) as FurnitureKind[]).filter(k => FURNITURE_KINDS[k].category === category)

/** Přidávání místností (kreslením nebo hotovým tvarem), překážek a nábytku do vybrané místnosti. */
export function AddPanel() {
  const rooms = useProjectStore(s => s.rooms)
  const obstacles = useProjectStore(s => s.obstacles)
  const furniture = useProjectStore(s => s.furniture)
  const electric = useProjectStore(s => s.electric)
  const addRoom = useProjectStore(s => s.addRoom)
  const addObstacle = useProjectStore(s => s.addObstacle)
  const addFurniture = useProjectStore(s => s.addFurniture)
  const { selection, tool, select, setTool } = useUiStore()

  // Věc jde do vybrané místnosti (nebo do místnosti vybrané věci), jinak do první.
  const selectedItem =
    selection?.type === 'obstacle' ? obstacles.find(o => o.id === selection.id)
    : selection?.type === 'furniture' ? furniture.find(f => f.id === selection.id)
    : selection?.type === 'electric' ? electric.find(p => p.id === selection.id)
    : undefined
  const targetRoomId = selection?.type === 'room' ? selection.id : selectedItem?.roomId ?? rooms[0]?.id

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

      <section>
        <h2>Nábytek</h2>
        {(Object.keys(FURNITURE_CATEGORIES) as FurnitureCategory[]).map(category => (
          <div key={category}>
            <small className="category">{FURNITURE_CATEGORIES[category]}</small>
            <div className="row">
              {furnitureByCategory(category).map(kind => (
                <button
                  key={kind} disabled={!targetRoomId}
                  title={`${FURNITURE_KINDS[kind].w} × ${FURNITURE_KINDS[kind].d} cm`}
                  onClick={() => {
                    const id = targetRoomId && addFurniture(kind, targetRoomId)
                    if (id) select({ type: 'furniture', id })
                  }}
                >
                  {FURNITURE_KINDS[kind].label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <small>Přetažením přichytíte ke zdi; tažením za konce změníte šířku.</small>
      </section>

      <ElectroPanel targetRoomId={targetRoomId} />
    </>
  )
}
