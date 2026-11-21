import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Obstacle } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { NumberField } from './NumberField'

export function ObstacleProperties({ obstacle }: { obstacle: Obstacle }) {
  const updateObstacle = useProjectStore(s => s.updateObstacle)
  const deleteObstacle = useProjectStore(s => s.deleteObstacle)
  const select = useUiStore(s => s.select)
  const set = (patch: Partial<Obstacle>) => updateObstacle(obstacle.id, patch)

  return (
    <section>
      <h2>{OBSTACLE_KINDS[obstacle.kind].label}</h2>
      <NumberField label="Šířka (cm)" value={obstacle.w} onCommit={v => set({ w: Math.max(5, v) })} />
      <NumberField label="Hloubka (cm)" value={obstacle.d} onCommit={v => set({ d: Math.max(2, v) })} />
      <NumberField label="Výška (cm)" value={obstacle.h} onCommit={v => set({ h: Math.max(5, v) })} />
      <NumberField label="Od podlahy (cm)" value={obstacle.elev} onCommit={v => set({ elev: Math.max(0, v) })} />
      <button className="danger" onClick={() => { deleteObstacle(obstacle.id); select(null) }}>Smazat</button>
    </section>
  )
}
