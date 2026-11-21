// Pravidla úprav, která potřebují znát konkrétní vybranou věc (u nábytku jeho druh).
import { canEditInMode, type ItemKind, type Mode, type Selection } from './uiStore'
import { useProjectStore } from './projectStore'

/** Smí aktuální záložka upravovat (přesouvat, mazat) vybranou věc? */
export function canEditSelection(selection: NonNullable<Selection>, mode: Mode): boolean {
  const { furniture, electric, cables } = useProjectStore.getState()
  const kind: ItemKind =
    selection.type === 'furniture' ? { furniture: furniture.find(f => f.id === selection.id)?.kind }
    : selection.type === 'electric' ? { point: electric.find(p => p.id === selection.id)?.kind }
    : selection.type === 'cable' ? { line: cables.find(c => c.id === selection.id)?.type }
    : {}
  return canEditInMode(selection.type, mode, kind)
}
