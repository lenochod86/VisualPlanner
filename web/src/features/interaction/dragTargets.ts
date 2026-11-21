// Přesun věcí (překážky, nábytek, elektro body) na polohu kurzoru v půdorysných souřadnicích.
// Sdílí ho 2D plán i 3D pohled, aby se věci chovaly stejně (snap ke zdi, přechod mezi místnostmi…).
import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Placed, Pt } from '../../domain/types'
import { dragElectricPatch } from '../../geometry/electric'
import { dragFurniturePatch, dragObstaclePatch } from '../../geometry/placement'
import { buildWallModel } from '../../geometry/walls'
import { useProjectStore } from '../../store/projectStore'

/** Odkaz na věc v jednom ze dvou seznamů projektu (překážky, nábytek). */
export type ItemRef = { collection: 'obstacles' | 'furniture'; id: string }

/** Cokoli, co jde přesouvat myší: věc v místnosti, nebo elektro bod. */
export type DragTarget = ItemRef | { collection: 'electric'; id: string }

export function findItem(ref: ItemRef): Placed | undefined {
  const s = useProjectStore.getState()
  return (ref.collection === 'obstacles' ? s.obstacles : s.furniture).find(i => i.id === ref.id)
}

export function patchItem(ref: ItemRef, patch: Partial<Placed>) {
  const s = useProjectStore.getState()
  if (ref.collection === 'obstacles') s.updateObstacle(ref.id, patch)
  else s.updateFurniture(ref.id, patch)
}

/** Přesune cíl tak, aby jeho střed byl u bodu `p` (cm v půdorysu); snapuje ke zdem a přepíná místnosti. */
export function dragTargetTo(target: DragTarget, p: Pt) {
  const state = useProjectStore.getState()

  if (target.collection === 'electric') {
    const point = state.electric.find(x => x.id === target.id)
    if (point) state.updateElectric(point.id, dragElectricPatch(point, state.rooms, p))
    return
  }

  const item = findItem(target)
  if (!item) return
  if (target.collection === 'furniture') {
    patchItem(target, dragFurniturePatch(item, state.rooms, buildWallModel(state.rooms), p))
    return
  }
  const room = state.rooms.find(r => r.id === item.roomId)
  const obstacle = state.obstacles.find(o => o.id === target.id)
  const inWall = !!obstacle && OBSTACLE_KINDS[obstacle.kind].inWall
  if (room) patchItem(target, dragObstaclePatch(room, p, inWall))
}
