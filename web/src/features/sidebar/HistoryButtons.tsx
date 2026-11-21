import { redo, undo, useHistoryStatus } from '../../store/history'

export function HistoryButtons() {
  const { canUndo, canRedo } = useHistoryStatus()
  return (
    <div className="row">
      <button disabled={!canUndo} onClick={undo} title="Zpět (Ctrl+Z)">↶ Zpět</button>
      <button disabled={!canRedo} onClick={redo} title="Znovu (Ctrl+Y)">↷ Znovu</button>
    </div>
  )
}
