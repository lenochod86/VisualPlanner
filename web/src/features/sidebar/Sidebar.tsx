import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { CableProperties } from './CableProperties'
import { ElectricProperties } from './ElectricProperties'
import { ElectroReport } from './ElectroReport'
import { ElectroPanel } from './ElectroPanel'
import { FlatSummary } from './FlatSummary'
import { FurnitureProperties } from './FurnitureProperties'
import { FurnitureIssues } from './FurnitureIssues'
import { FurniturePanel } from './FurniturePanel'
import { ObstacleProperties } from './ObstacleProperties'
import { RoomProperties } from './RoomProperties'
import { RoomsPanel } from './RoomsPanel'

/**
 * Levý panel. Nahoře nástroje podle záložky z horní lišty (Půdorys / Vybavení / Elektro),
 * pod nimi vlastnosti toho, co je právě vybráno, ať je to cokoli.
 */
export function Sidebar() {
  const mode = useUiStore(s => s.mode)
  const selection = useUiStore(s => s.selection)
  const room = useProjectStore(s => (selection?.type === 'room' ? s.rooms.find(r => r.id === selection.id) : undefined))
  const obstacle = useProjectStore(s => (selection?.type === 'obstacle' ? s.obstacles.find(o => o.id === selection.id) : undefined))
  const furniture = useProjectStore(s => (selection?.type === 'furniture' ? s.furniture.find(f => f.id === selection.id) : undefined))
  const electric = useProjectStore(s => (selection?.type === 'electric' ? s.electric.find(p => p.id === selection.id) : undefined))
  const cable = useProjectStore(s => (selection?.type === 'cable' ? s.cables.find(c => c.id === selection.id) : undefined))

  return (
    <aside className="sidebar">
      {mode === 'plan' && <RoomsPanel />}
      {mode === 'equipment' && <FurniturePanel />}
      {mode === 'equipment' && <FurnitureIssues />}
      {mode === 'electro' && <ElectroPanel />}

      {/* místnosti a jejich rozměry se upravují jen v záložce Půdorys */}
      {room && mode === 'plan' && <RoomProperties room={room} />}
      {room && mode !== 'plan' && (
        <section>
          <h2>Vybraná místnost: {room.name}</h2>
          <small>Místnosti a jejich rozměry se upravují v záložce Půdorys. Nové věci se přidávají do této místnosti.</small>
        </section>
      )}
      {obstacle && <ObstacleProperties obstacle={obstacle} />}
      {furniture && <FurnitureProperties furniture={furniture} />}
      {electric && <ElectricProperties point={electric} />}
      {cable && <CableProperties cable={cable} />}

      {mode === 'plan' && <FlatSummary />}
      {mode === 'electro' && <ElectroReport />}

      <small className="hint">
        Táhni stěnu = změna rozměru. Klik na číslo = zadání rozměru. Kolečko = zoom, tažení pozadí = posun.
        Nábytek a prvky jdou tahat i ve 3D. Delete = smazat vybrané, R = otočit nábytek (Shift+R opačně), Esc = zrušit výběr,
        Ctrl+Z / Ctrl+Y = zpět / znovu.
      </small>
    </aside>
  )
}
