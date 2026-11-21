import { describe, expect, it } from 'vitest'
import { DEFAULT_CEILING } from '../domain/materials'
import type { Furniture, Obstacle, Room } from '../domain/types'
import { findFurnitureIssues, orientedRect, polygonsOverlap } from './collisions'
import { shapePts } from './shapes'
import { buildWallModel } from './walls'

const room: Room = {
  id: 'A', name: 'A', type: 'other', pts: shapePts('rect', 0, 0, 400, 300), walls: [10, 10, 10, 10], height: 260,
  wallMaterials: ['plaster', 'plaster', 'plaster', 'plaster'], wallModes: ['auto', 'auto', 'auto', 'auto'], ceiling: { ...DEFAULT_CEILING },
}
const walls = buildWallModel([room])

const piece = (kind: Furniture['kind'], patch: Partial<Furniture> = {}): Furniture => ({
  id: kind + Math.random(), roomId: 'A', kind, w: 100, d: 50, h: 80, elev: 0, x: 200, y: 150, rot: 0, ...patch,
})
const issuesFor = (furniture: Furniture[], obstacles: Obstacle[] = []) =>
  findFurnitureIssues({ rooms: [room], obstacles, furniture }, walls)

describe('geometrie kolizí', () => {
  it('obdélníky se překrývají, ale pouhý dotyk hranou ne', () => {
    const a = orientedRect({ x: 0, y: 0 }, 0, 100, 100)
    expect(polygonsOverlap(a, orientedRect({ x: 80, y: 0 }, 0, 100, 100))).toBe(true)
    expect(polygonsOverlap(a, orientedRect({ x: 100, y: 0 }, 0, 100, 100))).toBe(false)
  })

  it('natočený obdélník se hodnotí podle skutečného tvaru', () => {
    const a = orientedRect({ x: 0, y: 0 }, 0, 200, 10)                        // vodorovná tyč
    const crossing = orientedRect({ x: 0, y: 40 }, Math.PI / 2, 200, 10)     // svislá tyč (y -60..140) vodorovnou kříží
    const apart = orientedRect({ x: 0, y: 150 }, Math.PI / 2, 200, 10)       // svislá tyč (y 50..250) je pod ní
    expect(polygonsOverlap(a, crossing)).toBe(true)
    expect(polygonsOverlap(a, apart)).toBe(false)
  })
})

describe('kontrola nábytku', () => {
  it('nábytek u zdi je v pořádku', () => {
    expect(issuesFor([piece('sofa', { w: 200, d: 90, attach: { edge: 0, along: 200 } })])).toEqual([])
  })

  it('nábytek přesahující za zeď je označen', () => {
    const issues = issuesFor([piece('sofa', { w: 200, d: 90, x: 200, y: 20 })])   // zadní část leží za horní zdí
    expect(issues.map(i => i.kind)).toContain('outside')
  })

  it('vyšší než strop', () => {
    expect(issuesFor([piece('wardrobe', { h: 300 })]).map(i => i.kind)).toContain('too-tall')
  })

  it('dva překrývající se kusy mají problém oba, TV nad gaučem ne', () => {
    const a = piece('table', { x: 200, y: 150 })
    const b = piece('table', { x: 230, y: 150 })
    expect(issuesFor([a, b]).filter(i => i.kind === 'overlap').map(i => i.furnitureId).sort()).toEqual([a.id, b.id].sort())

    const sofa = piece('sofa', { elev: 0, h: 85 })
    const tv = piece('tv', { elev: 100, h: 65 })
    expect(issuesFor([sofa, tv])).toEqual([])
  })

  it('radiátor pod nábytkem je kolize', () => {
    const radiator: Obstacle = { id: 'r', roomId: 'A', kind: 'radiator', w: 100, d: 10, h: 60, elev: 10, x: 200, y: 150, rot: 0 }
    expect(issuesFor([piece('chair', { w: 45, d: 45 })], [radiator]).map(i => i.kind)).toContain('overlap')
  })

  it('nábytek před dveřmi je označen jako blokující', () => {
    const door: Obstacle = { id: 'd', roomId: 'A', kind: 'door', w: 90, d: 12, h: 205, elev: 0, x: 0, y: 0, rot: 0, attach: { edge: 0, along: 200 } }
    const blocking = piece('sofa', { w: 200, d: 90, attach: { edge: 0, along: 200 } })
    expect(issuesFor([blocking], [door]).map(i => i.kind)).toContain('blocks-door')
    const away = piece('sofa', { w: 200, d: 90, attach: { edge: 2, along: 200 } })   // u protější zdi
    expect(issuesFor([away], [door])).toEqual([])
  })
})

describe('otvor ve zdi', () => {
  it('nábytek v průchodu otvorem je označen', () => {
    const opening: Obstacle = { id: 'o', roomId: 'A', kind: 'opening', w: 100, d: 12, h: 205, elev: 0, x: 0, y: 0, rot: 0, attach: { edge: 0, along: 200 } }
    const blocking = piece('sofa', { w: 200, d: 90, attach: { edge: 0, along: 200 } })
    expect(issuesFor([blocking], [opening]).map(i => i.message)).toContain('Blokuje průchod otvorem')
  })
})

describe('dveře otevírané ven', () => {
  it('nábytek před dveřmi, které se otevírají ven, nepřekáží', () => {
    const outwards: Obstacle = { id: 'd', roomId: 'A', kind: 'door', w: 90, d: 12, h: 205, elev: 0, x: 0, y: 0, rot: 0, swing: 'out', attach: { edge: 0, along: 200 } }
    const sofa = piece('sofa', { w: 200, d: 90, attach: { edge: 0, along: 200 } })
    expect(issuesFor([sofa], [outwards])).toEqual([])
  })
})
