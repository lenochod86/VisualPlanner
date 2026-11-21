import type { ProjectDocument, ProjectSummary } from '../types.js'

/** Rozhraní úložiště projektů. Implementaci lze vyměnit (soubory dnes, databáze později). */
export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>
  get(id: string): Promise<ProjectDocument | null>
  save(id: string, document: ProjectDocument): Promise<void>
  /** Vrací false, pokud projekt neexistoval. */
  remove(id: string): Promise<boolean>
}
