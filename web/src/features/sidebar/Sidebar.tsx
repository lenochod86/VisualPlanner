import type { SyncStatus } from '../persistence/useProjectSync'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { AddPanel } from './AddPanel'
import { FlatSummary } from './FlatSummary'
import { HistoryButtons } from './HistoryButtons'
import { CableProperties } from './CableProperties'
import { ElectricProperties } from './ElectricProperties'
import { FurnitureProperties } from './FurnitureProperties'
import { ObstacleProperties } from './ObstacleProperties'
import { ProjectFilePanel } from './ProjectFilePanel'
import { RoomProperties } from './RoomProperties'
import { ViewPanel } from './ViewPanel'

const STATUS_LABEL: Record<SyncStatus, string> = {
  loading: 'Načítám…',
  saving: 'Ukládám…',
  saved: 'Uloženo',
  offline: 'Server nedostupný - změny se neukládají',
}

export function Sidebar({ syncStatus }: { syncStatus: SyncStatus }) {
  const selection = useUiStore(s => s.selection)
  const room = useProjectStore(s => (selection?.type === 'room' ? s.rooms.find(r => r.id === selection.id) : undefined))
  const obstacle = useProjectStore(s => (selection?.type === 'obstacle' ? s.obstacles.find(o => o.id === selection.id) : undefined))
  const furniture = useProjectStore(s => (selection?.type === 'furniture' ? s.furniture.find(f => f.id === selection.id) : undefined))
  const electric = useProjectStore(s => (selection?.type === 'electric' ? s.electric.find(p => p.id === selection.id) : undefined))
  const cable = useProjectStore(s => (selection?.type === 'cable' ? s.cables.find(c => c.id === selection.id) : undefined))

  return (
    <aside className="sidebar">
      <h1>Visual Planner</h1>
      <small className={`status ${syncStatus}`}>{STATUS_LABEL[syncStatus]}</small>

      <HistoryButtons />
      <AddPanel />
      {room && <RoomProperties room={room} />}
      {obstacle && <ObstacleProperties obstacle={obstacle} />}
      {furniture && <FurnitureProperties furniture={furniture} />}
      {electric && <ElectricProperties point={electric} />}
      {cable && <CableProperties cable={cable} />}
      <FlatSummary />
      <ViewPanel />
      <ProjectFilePanel />

      <small className="hint">
        Táhni stěnu = změna rozměru. Klik na číslo = zadání rozměru. Kolečko = zoom, tažení pozadí = posun.
        Delete = smazat vybrané, R = otočit nábytek, Esc = zrušit výběr, Ctrl+Z / Ctrl+Y = zpět / znovu.
      </small>
    </aside>
  )
}
