import type { ProjectDocument, ProjectSummary } from '../types.js'
import type { ProjectRepository } from './projectRepository.js'

/** Úložiště v paměti, určené pro testy. */
export class MemoryProjectRepository implements ProjectRepository {
  private readonly documents = new Map<string, ProjectDocument>()

  async list(): Promise<ProjectSummary[]> {
    return [...this.documents].map(([id, doc]) => ({ id, updatedAt: doc.updatedAt }))
  }
  async get(id: string) { return this.documents.get(id) ?? null }
  async save(id: string, document: ProjectDocument) { this.documents.set(id, document) }
  async remove(id: string) { return this.documents.delete(id) }
}
