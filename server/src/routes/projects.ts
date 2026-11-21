import type { FastifyPluginAsync } from 'fastify'
import type { ProjectService } from '../services/projectService.js'
import type { ProjectInput } from '../types.js'

interface IdParams { id: string }

const projectBodySchema = {
  type: 'object',
  required: ['rooms', 'obstacles'],
  properties: {
    rooms: { type: 'array' },
    obstacles: { type: 'array' },
  },
} as const

/** REST routy projektů; registrují se pod /api/projects. */
export function projectRoutes(service: ProjectService): FastifyPluginAsync {
  return async app => {
    app.get('/', async () => service.list())

    app.get<{ Params: IdParams }>('/:id', async req => service.get(req.params.id))

    app.put<{ Params: IdParams; Body: ProjectInput }>(
      '/:id',
      { schema: { body: projectBodySchema } },
      async req => service.save(req.params.id, req.body),
    )

    app.delete<{ Params: IdParams }>('/:id', async (req, reply) => {
      await service.remove(req.params.id)
      return reply.code(204).send()
    })
  }
}
