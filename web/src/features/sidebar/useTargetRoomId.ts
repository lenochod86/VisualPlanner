import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'

/** Do které místnosti se přidává nová věc: do vybrané, nebo do místnosti vybrané věci; jinak do první. */
export function useTargetRoomId(): string | undefined {
  const selection = useUiStore(s => s.selection)
  return useProjectStore(s => {
    if (!selection) return s.rooms[0]?.id
    if (selection.type === 'room') return selection.id
    const collection =
      selection.type === 'obstacle' ? s.obstacles
      : selection.type === 'furniture' ? s.furniture
      : selection.type === 'electric' ? s.electric
      : undefined
    return collection?.find(i => i.id === selection.id)?.roomId ?? s.rooms[0]?.id
  })
}
