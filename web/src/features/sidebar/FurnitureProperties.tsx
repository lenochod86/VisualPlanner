import { FURNITURE_KINDS } from '../../domain/furnitureCatalog'
import type { Furniture } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useFurnitureIssues } from '../../store/useFurnitureIssues'
import { useUiStore } from '../../store/uiStore'
import { NumberField } from './NumberField'
import { PlacedFields } from './PlacedFields'

const toDegrees = (rad: number) => ((Math.round((rad * 180) / Math.PI) % 360) + 360) % 360

export function FurnitureProperties({ furniture }: { furniture: Furniture }) {
  const updateFurniture = useProjectStore(s => s.updateFurniture)
  const rotateFurniture = useProjectStore(s => s.rotateFurniture)
  const deleteFurniture = useProjectStore(s => s.deleteFurniture)
  const select = useUiStore(s => s.select)
  const onWall = !!furniture.attach
  const issues = useFurnitureIssues().filter(i => i.furnitureId === furniture.id)

  return (
    <section>
      <h2>{FURNITURE_KINDS[furniture.kind].label}</h2>
      {issues.map((issue, i) => <small key={i} className="error">⚠ {issue.message}</small>)}
      <PlacedFields item={furniture} onChange={patch => updateFurniture(furniture.id, patch)} />

      {onWall
        ? <small>Stojí u zdi a drží se jí při změně rozměrů místnosti. Odtažením od zdi ho uvolníte.</small>
        : <NumberField label="Natočení (°)" value={toDegrees(furniture.rot)}
            onCommit={v => updateFurniture(furniture.id, { rot: (v * Math.PI) / 180 })} />}

      <div className="row">
        <button onClick={() => rotateFurniture(furniture.id)} title="Klávesa R">⟳ Otočit o 90°</button>
        <button className="danger" onClick={() => { deleteFurniture(furniture.id); select(null) }}>Smazat</button>
      </div>
    </section>
  )
}
