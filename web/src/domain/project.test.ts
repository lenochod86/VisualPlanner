import { describe, expect, it } from 'vitest'
import { parseProject } from './project'

describe('parseProject: starší projekty', () => {
  const old = {
    rooms: [{ id: 'r', name: 'Obývák', type: 'living', wallT: 15, height: 250,
      pts: [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 300 }, { x: 0, y: 300 }] }],
    obstacles: [],
  }

  it('doplní tloušťky po stěnách, materiál, strop i prázdný nábytek', () => {
    const p = parseProject(old)
    expect(p.rooms[0].walls).toEqual([15, 15, 15, 15])
    expect(p.rooms[0].wallMaterials).toEqual(['plaster', 'plaster', 'plaster', 'plaster'])
    expect(p.rooms[0].ceiling.type).toBe('slab')
    expect(p.furniture).toEqual([])
  })

  it('zachová nastavení, které už projekt má', () => {
    const p = parseProject({ ...old, rooms: [{ ...old.rooms[0], wallMaterial: 'brick', ceiling: { type: 'sdk', drop: 12 } }] })
    expect(p.rooms[0].wallMaterials).toEqual(['brick', 'brick', 'brick', 'brick'])   // dřívější jeden materiál na místnost
    expect(p.rooms[0].ceiling).toMatchObject({ type: 'sdk', drop: 12, profileSpacing: 40 })
  })
})
