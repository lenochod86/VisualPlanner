import { FURNITURE_KINDS } from '../../domain/furnitureCatalog'
import type { Furniture } from '../../domain/types'
import { useProjectStore } from '../../store/projectStore'
import { useFurnitureIssues } from '../../store/useFurnitureIssues'
import { useUiStore } from '../../store/uiStore'

/** Název kusu nábytku; je-li jich stejného druhu víc, očíslovaný (Gauč 2). */
export function furnitureTitle(item: Furniture, all: Furniture[]): string {
  const sameKind = all.filter(f => f.kind === item.kind)
  const label = FURNITURE_KINDS[item.kind].label
  return sameKind.length > 1 ? `${label} ${sameKind.indexOf(item) + 1}` : label
}

/** Kontrola rozmístění: seznam problémů (přesah do zdi, překrytí, výška, dveře); klik vybere kus. */
export function FurnitureIssues() {
  const furniture = useProjectStore(s => s.furniture)
  const issues = useFurnitureIssues()
  const select = useUiStore(s => s.select)
  if (furniture.length === 0) return null

  return (
    <section>
      <h2>Kontrola rozmístění</h2>
      {issues.length === 0
        ? <small className="ok">Bez kolizí.</small>
        : (
          <ul className="issue-list">
            {issues.map((issue, i) => {
              const item = furniture.find(f => f.id === issue.furnitureId)
              return item && (
                <li key={i}>
                  <button onClick={() => select({ type: 'furniture', id: item.id })}>
                    <strong>{furnitureTitle(item, furniture)}</strong>: {issue.message}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
    </section>
  )
}
