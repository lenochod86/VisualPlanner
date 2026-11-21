import { notFound } from '../errors.js'
import type { ProjectRepository } from '../storage/projectRepository.js'
import type { ProjectDocument, ProjectInput, ProjectSummary } from '../types.js'

/** Aplikační logika projektů; o ukládání se stará repozitář, o HTTP routy. */
export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  list(): Promise<ProjectSummary[]> {
    return this.repository.list()
  }

  async get(id: string): Promise<ProjectDocument> {
    const document = await this.repository.get(id)
    if (!document) throw notFound('Projekt')
    return document
  }

  async save(id: string, input: ProjectInput): Promise<ProjectDocument> {
    // ukládáme jen známá pole, ať se do souboru nedostanou cizí data z těla požadavku
    const document: ProjectDocument = {
      rooms: input.rooms,
      obstacles: input.obstacles,
      furniture: input.furniture ?? [],
      updatedAt: new Date().toISOString(),
    }
    await this.repository.save(id, document)
    return document
  }

  async remove(id: string): Promise<void> {
    if (!(await this.repository.remove(id))) throw notFound('Projekt')
  }
}
