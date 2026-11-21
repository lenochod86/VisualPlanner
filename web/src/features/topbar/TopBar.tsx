import type { SyncStatus } from '../persistence/useProjectSync'
import { useUiStore, type Mode } from '../../store/uiStore'
import { HistoryButtons } from '../sidebar/HistoryButtons'
import { FileButtons } from './FileButtons'
import { PrintMenu } from './PrintMenu'

const TABS: { mode: Mode; label: string }[] = [
  { mode: 'plan', label: 'Půdorys' },
  { mode: 'equipment', label: 'Vybavení' },
  { mode: 'decor', label: 'Dekorace' },
  { mode: 'electro', label: 'Elektro' },
]

const STATUS_LABEL: Record<SyncStatus, string> = {
  loading: 'Načítám…',
  saving: 'Ukládám…',
  saved: 'Uloženo',
  offline: 'Server nedostupný - změny se neukládají',
}

/** Horní lišta: název a stav ukládání, záložky režimů, zpět/znovu a export/import. */
export function TopBar({ syncStatus }: { syncStatus: SyncStatus }) {
  const mode = useUiStore(s => s.mode)
  const setMode = useUiStore(s => s.setMode)

  return (
    <header className="topbar">
      <div className="brand">
        <strong>Visual Planner</strong>
        <small className={`status ${syncStatus}`}>{STATUS_LABEL[syncStatus]}</small>
      </div>

      <nav className="tabs">
        {TABS.map(tab => (
          <button key={tab.mode} className={`tab ${mode === tab.mode ? 'active' : ''}`} onClick={() => setMode(tab.mode)}>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        <HistoryButtons />
        <FileButtons />
        <PrintMenu />
      </div>
    </header>
  )
}
