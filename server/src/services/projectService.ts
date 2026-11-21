import { notFound } from '../errors.js'
import type { ProjectRepository } from '../storage/projectRepository.js'
import { OPTIONAL_COLLECTIONS, REQUIRED_COLLECTIONS, type ProjectDocument, type ProjectInput, type ProjectSummary } from '../types.js'

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
    const document = { updatedAt: new Date().toISOString() } as ProjectDocument
    for (const name of REQUIRED_COLLECTIONS) document[name] = input[name]
    for (const name of OPTIONAL_COLLECTIONS) document[name] = input[name] ?? []
    await this.repository.save(id, document)
    return document
  }

  async remove(id: string): Promise<void> {
    if (!(await this.repository.remove(id))) throw notFound('Projekt')
  }
}
