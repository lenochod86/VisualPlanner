import { useEffect } from 'react'
import { redo, undo } from './store/history'
import { useProjectStore } from './store/projectStore'
import { useUiStore } from './store/uiStore'

/** Ctrl+Z / Ctrl+Y (nebo Ctrl+Shift+Z) = zpět/znovu, Delete maže vybrané, Esc ruší výběr a kreslení. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return  // v políčkách nechceme přebíjet psaní

      const ui = useUiStore.getState()
      const key = e.key.toLowerCase()

      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
      } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault()
        redo()
      } else if (key === 'r' && ui.selection?.type === 'furniture') {
        useProjectStore.getState().rotateFurniture(ui.selection.id, e.shiftKey ? -90 : 90)
      } else if (e.key === 'Escape') {
        ui.select(null)
        ui.setCableStart(null)
        ui.setTool('select')
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selection) {
        const project = useProjectStore.getState()
        if (ui.selection.type === 'room') project.deleteRoom(ui.selection.id)
        else if (ui.selection.type === 'furniture') project.deleteFurniture(ui.selection.id)
        else if (ui.selection.type === 'electric') project.deleteElectric(ui.selection.id)
        else if (ui.selection.type === 'cable') project.deleteCable(ui.selection.id)
        else project.deleteObstacle(ui.selection.id)
        ui.select(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
