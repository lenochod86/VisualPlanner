import { useMemo } from 'react'
import { findFurnitureIssues, type FurnitureIssue } from '../geometry/collisions'
import { useProjectStore } from './projectStore'
import { useWallModel } from './useWallModel'

/** Problémy s rozmístěním nábytku (přepočítají se jen při změně místností, překážek nebo nábytku). */
export function useFurnitureIssues(): FurnitureIssue[] {
  const rooms = useProjectStore(s => s.rooms)
  const obstacles = useProjectStore(s => s.obstacles)
  const furniture = useProjectStore(s => s.furniture)
  const walls = useWallModel()
  return useMemo(() => findFurnitureIssues({ rooms, obstacles, furniture }, walls), [rooms, obstacles, furniture, walls])
}
