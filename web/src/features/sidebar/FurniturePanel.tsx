import { FURNITURE_CATEGORIES, FURNITURE_KINDS, type FurnitureCategory } from '../../domain/furnitureCatalog'
import type { FurnitureKind } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { useTargetRoomId } from './useTargetRoomId'

const kindsIn = (category: FurnitureCategory) =>
  (Object.keys(FURNITURE_KINDS) as FurnitureKind[]).filter(k => FURNITURE_KINDS[k].category === category)

/** Záložka Vybavení: katalog nábytku a sanity; přidává se do vybrané místnosti. */
export function FurniturePanel() {
  const addFurniture = useProjectStore(s => s.addFurniture)
  const select = useUiStore(s => s.select)
  const targetRoomId = useTargetRoomId()

  return (
    <section>
      <h2>Nábytek</h2>
      {(Object.keys(FURNITURE_CATEGORIES) as FurnitureCategory[]).filter(c => c !== 'decor').map(category => (
        <div key={category}>
          <small className="category">{FURNITURE_CATEGORIES[category]}</small>
          <div className="row">
            {kindsIn(category).map(kind => (
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
        </div>
      ))}
      <small>Přidá se do vybrané místnosti. Tažením (v půdorysu i ve 3D) přichytíte ke zdi; za konce změníte šířku.</small>
      <small>Umyvadlo a sprchový kout přidají i přípojky studené (SV) a teplé (TUV) vody a odpad (záložka Vodoinstalace).</small>
    </section>
  )
}
