import { Plan2D } from './features/plan2d/Plan2D'
import { useProjectSync } from './features/persistence/useProjectSync'
import { Sidebar } from './features/sidebar/Sidebar'
import { View3D } from './features/view3d/View3D'
import { useUiStore } from './store/uiStore'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export function App() {
  const syncStatus = useProjectSync()
  const show3d = useUiStore(s => s.show3d)
  const toggle3d = useUiStore(s => s.toggle3d)
  useKeyboardShortcuts()

  return (
    <div className="app">
      <Sidebar syncStatus={syncStatus} />
      <main>
        <div className="pane"><div className="pane-title">Půdorys</div><Plan2D /></div>

        {/* Pravý panel se 3D pohledem; po sbalení zůstane jen úzký pruh se šipkou. Skrytá scéna se nevykresluje. */}
        <aside className={`view3d-panel ${show3d ? 'open' : 'closed'}`}>
          <button className="panel-toggle" onClick={toggle3d} title={show3d ? 'Skrýt 3D pohled' : 'Zobrazit 3D pohled'}>
            {show3d ? '▶' : '◀'}
          </button>
          {show3d ? <><div className="pane-title">3D</div><View3D /></> : <div className="rail-label">3D</div>}
        </aside>
      </main>
    </div>
  )
}
