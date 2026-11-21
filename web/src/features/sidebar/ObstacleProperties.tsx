import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Obstacle } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { PlacedFields } from './PlacedFields'

export function ObstacleProperties({ obstacle }: { obstacle: Obstacle }) {
  const updateObstacle = useProjectStore(s => s.updateObstacle)
  const deleteObstacle = useProjectStore(s => s.deleteObstacle)
  const select = useUiStore(s => s.select)

  const hinge = obstacle.hinge ?? 'left'
  const swing = obstacle.swing ?? 'in'

  return (
    <section>
      <h2>{OBSTACLE_KINDS[obstacle.kind].label}</h2>
      <PlacedFields item={obstacle} onChange={patch => updateObstacle(obstacle.id, patch)} />

      {obstacle.kind === 'door' && (
        <>
          <label className="field">Závěsy
            <select value={hinge} onChange={e => updateObstacle(obstacle.id, { hinge: e.target.value as Obstacle['hinge'] })}>
              <option value="left">Levé</option>
              <option value="right">Pravé</option>
            </select>
          </label>
          <label className="field">Otevírání
            <select value={swing} onChange={e => updateObstacle(obstacle.id, { swing: e.target.value as Obstacle['swing'] })}>
              <option value="in">Do místnosti</option>
              <option value="out">Ven z místnosti</option>
            </select>
          </label>
          <button
            title="Otočí dveře o 180° kolem svislé osy: závěsy na opačnou stranu a otevírání na opačnou stranu zdi"
            onClick={() => updateObstacle(obstacle.id, {
              hinge: hinge === 'left' ? 'right' : 'left',
              swing: swing === 'in' ? 'out' : 'in',
            })}
          >
            ⟳ Otočit o 180°
          </button>
          <small>Levé/pravé = strana závěsů při pohledu z místnosti na dveře.</small>
        </>
      )}

      <button className="danger" onClick={() => { deleteObstacle(obstacle.id); select(null) }}>Smazat</button>
    </section>
  )
}
