import { FURNITURE_CATEGORIES, FURNITURE_KINDS, isDecor } from '../../domain/furnitureCatalog'
import type { FurnitureKind } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { FinishPanel } from './FinishPanel'
import { useTargetRoomId } from './useTargetRoomId'

const decorKinds = (Object.keys(FURNITURE_KINDS) as FurnitureKind[]).filter(isDecor)

/** Záložka Dekorace: police a květiny do vybrané místnosti a povrchy (barvy, materiály) vybrané místnosti. */
export function DecorPanel() {
  const addFurniture = useProjectStore(s => s.addFurniture)
  const select = useUiStore(s => s.select)
  const targetRoomId = useTargetRoomId()

  return (
    <>
      <section>
        <h2>{FURNITURE_CATEGORIES.decor}</h2>
        <div className="row">
          {decorKinds.map(kind => (
            <button
              key={kind} disabled={!targetRoomId}
              title={`${FURNITURE_KINDS[kind].w} × ${FURNITURE_KINDS[kind].d} cm`}
              onClick={() => {
                const id = targetRoomId && addFurniture(kind, targetRoomId)
                if (id) select({ type: 'furniture', id })
              }}
            >
              {FURNITURE_KINDS[kind].label}
            </button>
          ))}
        </div>
        <small>Přidá se do vybrané místnosti. Tažením přichytíte ke zdi.</small>
      </section>
      <FinishPanel />
    </>
  )
}
