import Fastify from 'fastify'
import { projectRoutes } from './routes/projects.js'
import type { ProjectService } from './services/projectService.js'

/** Sestaví aplikaci. Služby dostává zvenku, takže ji testy mohou postavit nad paměťovým úložištěm. */
export function buildApp(projects: ProjectService, options: { logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? false })
  app.get('/api/health', async () => ({ status: 'ok' }))
  app.register(projectRoutes(projects), { prefix: '/api/projects' })
  return app
}
