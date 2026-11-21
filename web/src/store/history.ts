// Undo/redo nad stavem projektu. Stav je neměnný (immutable), takže historie jsou prostě
// odkazy na dřívější verze `rooms`/`obstacles` - nic se nekopíruje.
//
// "Gesto" = skupina změn, která se počítá jako jeden krok (celé tažení myší, psaní do políčka).
// Mezi beginGesture() a endGesture() se zapíše do historie jen stav před první změnou.
import { create } from 'zustand'
import type { Project } from '../domain/types'
import { selectProject, useProjectStore } from './projectStore'

const LIMIT = 100

let undoStack: Project[] = []
let redoStack: Project[] = []
let inGesture = false
let gestureRecorded = false
let restoring = false   // true, když undo/redo samo mění stav; takovou změnu nezapisujeme

/** Pro tlačítka: co je právě k dispozici. */
export const useHistoryStatus = create<{ canUndo: boolean; canRedo: boolean }>()(() => ({ canUndo: false, canRedo: false }))

const publish = () => useHistoryStatus.setState({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 })

useProjectStore.subscribe((state, prev) => {
  if (restoring) return
  if (state.rooms === prev.rooms && state.obstacles === prev.obstacles) return
  if (inGesture && gestureRecorded) return

  undoStack.push(selectProject(prev))
  if (undoStack.length > LIMIT) undoStack.shift()
  redoStack = []                      // nová úprava zahodí "budoucnost"
  if (inGesture) gestureRecorded = true
  publish()
})

export function beginGesture() {
  inGesture = true
  gestureRecorded = false
}

export function endGesture() {
  inGesture = false
}

function restore(project: Project) {
  restoring = true
  useProjectStore.getState().loadProject(project)
  restoring = false
}

export function undo() {
  const previous = undoStack.pop()
  if (!previous) return
  redoStack.push(selectProject(useProjectStore.getState()))
  restore(previous)
  publish()
}

export function redo() {
  const next = redoStack.pop()
  if (!next) return
  undoStack.push(selectProject(useProjectStore.getState()))
  restore(next)
  publish()
}

/** Po načtení projektu ze serveru: začínáme s prázdnou historií. */
export function clearHistory() {
  undoStack = []
  redoStack = []
  publish()
}
