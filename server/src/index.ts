import { buildApp } from './app.js'
import { config } from './config.js'
import { ProjectService } from './services/projectService.js'
import { FileProjectRepository } from './storage/fileProjectRepository.js'

const projects = new ProjectService(new FileProjectRepository(config.dataDir))
const app = buildApp(projects, { logger: true })

app.listen({ port: config.port, host: '0.0.0.0' }).catch(err => {
  app.log.error(err)
  process.exit(1)
})
