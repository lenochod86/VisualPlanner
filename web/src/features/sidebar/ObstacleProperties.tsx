import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Obstacle } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { PlacedFields } from './PlacedFields'

export function ObstacleProperties({ obstacle }: { obstacle: Obstacle }) {
  const updateObstacle = useProjectStore(s => s.updateObstacle)
  const deleteObstacle = useProjectStore(s => s.deleteObstacle)
  const select = useUiStore(s => s.select)

  return (
    <section>
      <h2>{OBSTACLE_KINDS[obstacle.kind].label}</h2>
      <PlacedFields item={obstacle} onChange={patch => updateObstacle(obstacle.id, patch)} />
      <button className="danger" onClick={() => { deleteObstacle(obstacle.id); select(null) }}>Smazat</button>
    </section>
  )
}
