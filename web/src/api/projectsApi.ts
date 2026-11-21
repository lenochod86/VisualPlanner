// Tenký klient REST API (viz server/). V dev i prod běží API pod stejným originem na /api.
import { parseProject } from '../domain/project'
import type { Project } from '../domain/types'

const url = (id: string) => `/api/projects/${encodeURIComponent(id)}`

/** Vrátí projekt, nebo null, pokud na serveru ještě neexistuje. */
export async function fetchProject(id: string): Promise<Project | null> {
  const res = await fetch(url(id))
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Načtení projektu selhalo (${res.status})`)
  return parseProject(await res.json())
}

export async function putProject(id: string, project: Project): Promise<void> {
  const res = await fetch(url(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  })
  if (!res.ok) throw new Error(`Uložení projektu selhalo (${res.status})`)
}
