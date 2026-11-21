import { describe, expect, it } from 'vitest'
import { DEFAULT_CEILING } from '../domain/materials'
import type { Room } from '../domain/types'
import { ceilingLevel, profileSegments } from './ceiling'
import { shapePts } from './shapes'

const room = (pts = shapePts('rect', 0, 0, 400, 300), ceiling = {}): Room => ({
  id: 'r', name: 'r', type: 'other', pts, walls: pts.map(() => 10), height: 260,
  wallMaterials: pts.map(() => 'plaster' as const), wallModes: pts.map(() => 'auto' as const), ceiling: { ...DEFAULT_CEILING, type: 'sdk', ...ceiling },
})

describe('stropy', () => {
  it('SDK podhled visí pod stropem, omítnutý strop je v úrovni výšky', () => {
    expect(ceilingLevel(room())).toBe(250)
    expect(ceilingLevel(room(undefined, { type: 'slab' }))).toBe(260)
  })

  it('rastr profilů pokrývá obdélník v zadané rozteči', () => {
    const { main, cross } = profileSegments(room())      // 400×300, rozteč 40 / 100
    expect(main).toHaveLength(7)                          // y = 30, 70, …, 270
    expect(main[0]).toEqual({ a: { x: 0, y: 30 }, b: { x: 400, y: 30 } })
    expect(cross).toHaveLength(4)                         // x = 30, 130, 230, 330
    expect(cross[0].b.y - cross[0].a.y).toBe(300)
  })

  it('profily nevedou přes výřez tvaru L', () => {
    const l = room(shapePts('L-right', 0, 0, 400, 300))   // výřez vpravo nahoře: x 240..400, y 0..120
    const { main } = profileSegments(l)
    const topLine = main.find(s => s.a.y === 30)!         // y = 30 leží ve výřezu
    expect(topLine.b.x).toBe(240)
  })
})
