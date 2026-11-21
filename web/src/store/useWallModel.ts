import { useMemo } from 'react'
import { buildWallModel, type WallModel } from '../geometry/walls'
import { useProjectStore } from './projectStore'

/** Odvozený model zdí (tloušťky, sdílené zdi) aktuálního projektu; přepočítá se jen při změně místností. */
export function useWallModel(): WallModel {
  const rooms = useProjectStore(s => s.rooms)
  return useMemo(() => buildWallModel(rooms), [rooms])
}
