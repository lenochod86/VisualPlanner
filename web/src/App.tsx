import { Plan2D } from './features/plan2d/Plan2D'
import { useProjectSync } from './features/persistence/useProjectSync'
import { Sidebar } from './features/sidebar/Sidebar'
import { View3D } from './features/view3d/View3D'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export function App() {
  const syncStatus = useProjectSync()
  useKeyboardShortcuts()

  return (
    <div className="app">
      <Sidebar syncStatus={syncStatus} />
      <main>
        <div className="pane"><div className="pane-title">Půdorys</div><Plan2D /></div>
        <div className="pane"><div className="pane-title">3D</div><View3D /></div>
      </main>
    </div>
  )
}
