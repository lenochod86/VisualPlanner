import type { SyncStatus } from '../persistence/useProjectSync'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { AddPanel } from './AddPanel'
import { FlatSummary } from './FlatSummary'
import { HistoryButtons } from './HistoryButtons'
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

  return (
    <aside className="sidebar">
      <h1>Visual Planner</h1>
      <small className={`status ${syncStatus}`}>{STATUS_LABEL[syncStatus]}</small>

      <HistoryButtons />
      <AddPanel />
      {room && <RoomProperties room={room} />}
      {obstacle && <ObstacleProperties obstacle={obstacle} />}
      <FlatSummary />
      <ViewPanel />
      <ProjectFilePanel />

      <small className="hint">
        Táhni stěnu = změna rozměru. Klik na číslo = zadání rozměru. Kolečko = zoom, tažení pozadí = posun.
        Delete = smazat vybrané, Esc = zrušit výběr, Ctrl+Z / Ctrl+Y = zpět / znovu.
      </small>
    </aside>
  )
}
