import { describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { ProjectService } from './services/projectService.js'
import { MemoryProjectRepository } from './storage/memoryProjectRepository.js'

const app = () => buildApp(new ProjectService(new MemoryProjectRepository()))
const project = { rooms: [{ id: 'a' }], obstacles: [] }

describe('API projektů', () => {
  it('neexistující projekt vrátí 404', async () => {
    const res = await app().inject({ method: 'GET', url: '/api/projects/nic' })
    expect(res.statusCode).toBe(404)
  })

  it('uloží a vrátí projekt', async () => {
    const server = app()
    const put = await server.inject({ method: 'PUT', url: '/api/projects/byt', payload: project })
    expect(put.statusCode).toBe(200)
    const get = await server.inject({ method: 'GET', url: '/api/projects/byt' })
    expect(get.json()).toMatchObject(project)
  })

  it('odmítne tělo bez místností', async () => {
    const res = await app().inject({ method: 'PUT', url: '/api/projects/byt', payload: { obstacles: [] } })
    expect(res.statusCode).toBe(400)
  })

  it('smaže projekt', async () => {
    const server = app()
    await server.inject({ method: 'PUT', url: '/api/projects/byt', payload: project })
    expect((await server.inject({ method: 'DELETE', url: '/api/projects/byt' })).statusCode).toBe(204)
    expect((await server.inject({ method: 'GET', url: '/api/projects/byt' })).statusCode).toBe(404)
  })
})

describe('nábytek v projektu', () => {
  it('uloží a vrátí nábytek; bez něj vrátí prázdné pole', async () => {
    const server = app()
    await server.inject({ method: 'PUT', url: '/api/projects/a', payload: { ...project, furniture: [{ id: 'f' }] } })
    expect((await server.inject({ method: 'GET', url: '/api/projects/a' })).json().furniture).toEqual([{ id: 'f' }])

    await server.inject({ method: 'PUT', url: '/api/projects/b', payload: project })
    expect((await server.inject({ method: 'GET', url: '/api/projects/b' })).json().furniture).toEqual([])
  })
})
