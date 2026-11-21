import { useEffect } from 'react'
import { useProjectStore } from './store/projectStore'
import { useUiStore } from './store/uiStore'

/** Delete maže vybranou místnost/překážku, Esc ruší výběr a kreslení. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return  // nepřebíjíme psaní do políček

      const ui = useUiStore.getState()
      if (e.key === 'Escape') {
        ui.select(null)
        ui.setTool('select')
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selection) {
        const project = useProjectStore.getState()
        if (ui.selection.type === 'room') project.deleteRoom(ui.selection.id)
        else project.deleteObstacle(ui.selection.id)
        ui.select(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
