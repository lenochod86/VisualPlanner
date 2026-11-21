import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { badRequest } from '../errors.js'
import type { ProjectDocument, ProjectSummary } from '../types.js'
import type { ProjectRepository } from './projectRepository.js'

const VALID_ID = /^[a-zA-Z0-9_-]{1,64}$/

const isMissingFile = (e: unknown) => (e as NodeJS.ErrnoException).code === 'ENOENT'

/** Každý projekt je jeden JSON soubor `<dataDir>/<id>.json`. */
export class FileProjectRepository implements ProjectRepository {
  constructor(private readonly dataDir: string) {}

  /** Id jde přímo do názvu souboru, proto přísná kontrola (žádné `../`). */
  private filePath(id: string): string {
    if (!VALID_ID.test(id)) throw badRequest('Neplatné id projektu')
    return path.join(this.dataDir, `${id}.json`)
  }

  async list(): Promise<ProjectSummary[]> {
    let files: string[]
    try {
      files = await readdir(this.dataDir)
    } catch (e) {
      if (isMissingFile(e)) return []
      throw e
    }
    const summaries: ProjectSummary[] = []
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const id = file.slice(0, -'.json'.length)
      const doc = await this.get(id)
      if (doc) summaries.push({ id, updatedAt: doc.updatedAt })
    }
    return summaries
  }

  async get(id: string): Promise<ProjectDocument | null> {
    try {
      return JSON.parse(await readFile(this.filePath(id), 'utf8')) as ProjectDocument
    } catch (e) {
      if (isMissingFile(e)) return null
      throw e
    }
  }

  async save(id: string, document: ProjectDocument): Promise<void> {
    const target = this.filePath(id)
    await mkdir(this.dataDir, { recursive: true })
    // zápis přes dočasný soubor, aby pád uprostřed zápisu nezničil existující projekt
    const temp = `${target}.${process.pid}.tmp`
    await writeFile(temp, JSON.stringify(document))
    await rename(temp, target)
  }

  async remove(id: string): Promise<boolean> {
    try {
      await unlink(this.filePath(id))
      return true
    } catch (e) {
      if (isMissingFile(e)) return false
      throw e
    }
  }
}
