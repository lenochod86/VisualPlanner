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
  const { show3d, showPlan, toggle3d, togglePlan, requestFit } = useUiStore()
  useKeyboardShortcuts()

  return (
    <div className="app">
      <TopBar syncStatus={syncStatus} />
      <div className="workspace">
        <Sidebar />
        <main>
          {/* Půdorys se sbaluje doleva do úzkého pruhu. Zůstává v paměti, takže si pamatuje zoom a posun. */}
          <section className={`pane plan-panel ${showPlan ? 'open' : 'closed'}`}>
            {/* aspoň jeden z panelů musí zůstat otevřený */}
            <button className="panel-toggle plan-toggle" onClick={togglePlan} disabled={showPlan && !show3d}
              title={showPlan ? 'Skrýt půdorys' : 'Zobrazit půdorys'}>
              {showPlan ? '◀' : '▶'}
            </button>
            <div className="pane-title">Půdorys</div>
            <div className="plan-tools">
              <button onClick={requestFit} title="Přizpůsobit pohled celému bytu">⤢ Celý byt</button>
              <PrintMenu />
            </div>
            <Plan2D />
            {!showPlan && <div className="rail-label">Půdorys</div>}
          </section>

          {/* Pravý panel se 3D pohledem; po sbalení zůstane jen úzký pruh se šipkou. Skrytá scéna se nevykresluje. */}
          <aside className={`view3d-panel ${show3d ? 'open' : 'closed'} ${showPlan ? '' : 'wide'}`}>
            <button className="panel-toggle" onClick={toggle3d} disabled={show3d && !showPlan}
              title={show3d ? 'Skrýt 3D pohled' : 'Zobrazit 3D pohled'}>
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
