import { Plan2D } from './features/plan2d/Plan2D'
import { PrintMenu } from './features/plan2d/PrintMenu'
import { useProjectSync } from './features/persistence/useProjectSync'
import { Sidebar } from './features/sidebar/Sidebar'
import { TopBar } from './features/topbar/TopBar'
import { View3D } from './features/view3d/View3D'
import { ViewMenu } from './features/view3d/ViewMenu'
import { useUiStore } from './store/uiStore'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export function App() {
  const syncStatus = useProjectSync()
  const show3d = useUiStore(s => s.show3d)
  const toggle3d = useUiStore(s => s.toggle3d)
  const requestFit = useUiStore(s => s.requestFit)
  useKeyboardShortcuts()

  return (
    <div className="app">
      <TopBar syncStatus={syncStatus} />
      <div className="workspace">
        <Sidebar />
        <main>
          <div className="pane">
            <div className="pane-title">Půdorys</div>
            <div className="plan-tools">
              <button onClick={requestFit} title="Přizpůsobit pohled celému bytu">⤢ Celý byt</button>
              <PrintMenu />
            </div>
            <Plan2D />
          </div>

          {/* Pravý panel se 3D pohledem; po sbalení zůstane jen úzký pruh se šipkou. Skrytá scéna se nevykresluje. */}
          <aside className={`view3d-panel ${show3d ? 'open' : 'closed'}`}>
            <button className="panel-toggle" onClick={toggle3d} title={show3d ? 'Skrýt 3D pohled' : 'Zobrazit 3D pohled'}>
              {show3d ? '▶' : '◀'}
            </button>
            {show3d
              ? <><div className="pane-title">3D</div><ViewMenu /><View3D /></>
              : <div className="rail-label">3D</div>}
          </aside>
        </main>
      </div>
    </div>
  )
}
