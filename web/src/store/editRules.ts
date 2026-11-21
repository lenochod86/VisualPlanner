// Pravidla úprav, která potřebují znát konkrétní vybranou věc (u nábytku jeho druh).
import { canEditInMode, type Mode, type Selection } from './uiStore'
import { useProjectStore } from './projectStore'

/** Smí aktuální záložka upravovat (přesouvat, mazat) vybranou věc? */
export function canEditSelection(selection: NonNullable<Selection>, mode: Mode): boolean {
  const kind = selection.type === 'furniture'
    ? useProjectStore.getState().furniture.find(f => f.id === selection.id)?.kind
    : undefined
  return canEditInMode(selection.type, mode, kind)
}
