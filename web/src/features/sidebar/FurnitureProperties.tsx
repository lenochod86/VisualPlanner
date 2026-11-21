import { FURNITURE_KINDS } from '../../domain/furnitureCatalog'
import type { Furniture } from '../../domain/types'
import { resolvePlacement } from '../../geometry/placement'
import { useProjectStore } from '../../store/projectStore'
import { useFurnitureIssues } from '../../store/useFurnitureIssues'
import { useUiStore } from '../../store/uiStore'
import { useWallModel } from '../../store/useWallModel'
import { NumberField } from './NumberField'
import { PlacedFields } from './PlacedFields'

/** Úhel ve stupních v rozsahu 0-359. */
const toDegrees = (rad: number) => ((Math.round((rad * 180) / Math.PI) % 360) + 360) % 360

export function FurnitureProperties({ furniture }: { furniture: Furniture }) {
  const updateFurniture = useProjectStore(s => s.updateFurniture)
  const rotateFurniture = useProjectStore(s => s.rotateFurniture)
  const setFurnitureRotation = useProjectStore(s => s.setFurnitureRotation)
  const deleteFurniture = useProjectStore(s => s.deleteFurniture)
  const room = useProjectStore(s => s.rooms.find(r => r.id === furniture.roomId))
  const select = useUiStore(s => s.select)
  const walls = useWallModel()
  const issues = useFurnitureIssues().filter(i => i.furnitureId === furniture.id)

  // u kusu na zdi je natočení dané zdí; ukážeme skutečné
  const rotation = room ? resolvePlacement(furniture, room, walls).rot : furniture.rot
  const snapping = furniture.snapToWalls !== false

  return (
    <section>
      <h2>{FURNITURE_KINDS[furniture.kind].label}</h2>
      {issues.map((issue, i) => <small key={i} className="error">⚠ {issue.message}</small>)}
      <PlacedFields item={furniture} onChange={patch => updateFurniture(furniture.id, patch)} />

      <NumberField label="Natočení (°)" value={toDegrees(rotation)} onCommit={v => setFurnitureRotation(furniture.id, v)} />
      <div className="row">
        <button onClick={() => rotateFurniture(furniture.id, -90)} title="Shift+R">↺ −90°</button>
        <button onClick={() => rotateFurniture(furniture.id, 90)} title="Klávesa R">⟳ +90°</button>
      </div>
      <label className="check">
        <input type="checkbox" checked={snapping} onChange={e => updateFurniture(furniture.id, { snapToWalls: e.target.checked })} />
        Přichytávat ke zdi při tažení
      </label>
      <small>
        {furniture.attach
          ? 'Stojí u zdi a drží se jí při změně rozměrů místnosti. Otočením se ze zdi uvolní.'
          : snapping
            ? 'Stojí volně; při tažení k zdi se přichytí zády ke zdi.'
            : 'Stojí volně a drží natočení; ke zdi se nepřichytává.'}
      </small>

      <button className="danger" onClick={() => { deleteFurniture(furniture.id); select(null) }}>Smazat</button>
    </section>
  )
}
