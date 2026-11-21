import { describe, expect, it } from 'vitest'
import { DEFAULT_CEILING } from '../domain/materials'
import type { Pt, Room, Waypoint } from '../domain/types'
import { insetPolygon, PIPE_WALL_OFFSET, wallHug, wallPipeRoute } from './pipeRoute'
import { shapePts } from './shapes'

const room = (id: string, x: number): Room => ({
  id, name: id, type: 'other', pts: shapePts('rect', x, 0, 400, 300), walls: [10, 10, 10, 10], height: 260,
  wallMaterials: ['plaster', 'plaster', 'plaster', 'plaster'], wallModes: ['auto', 'auto', 'auto', 'auto'], ceiling: { ...DEFAULT_CEILING },
})
const A = room('a', 0)
const B = room('b', 410)                                       // sousední místnost, zeď tlustá 10 cm

const length = (pts: Pt[]) => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0)
const wp = (x: number, y: number, z = 85): Waypoint => ({ x, y, z })

describe('potrubí po stěnách', () => {
  it('obvod se posune o odstup dovnitř', () => {
    const ring = insetPolygon(A.pts, 3)
    const xs = ring.map(p => p.x), ys = ring.map(p => p.y)
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([3, 397, 3, 297])
  })

  it('po zdi kratším směrem: do sousední zdi přes roh, ne středem místnosti', () => {
    // body na horní a pravé zdi: kratší cesta vede přes pravý horní roh
    const path = wallHug(A, { x: 300, y: 0 }, { x: 400, y: 100 })
    expect(path[0]).toEqual({ x: 300, y: 3 })
    expect(path[path.length - 1]).toEqual({ x: 397, y: 100 })
    expect(path).toContainEqual({ x: 397, y: 3 })              // roh
    expect(path).toHaveLength(3)
  })

  it('vybere kratší z obou směrů kolem dokola', () => {
    const near = wallHug(A, { x: 50, y: 0 }, { x: 0, y: 50 })  // přes levý horní roh (krátce)
    expect(near).toContainEqual({ x: 3, y: 3 })
    expect(length(near)).toBeLessThan(120)
  })

  it('bod stojící volně uprostřed místnosti se napojí kolmo na nejbližší zeď', () => {
    const path = wallHug(A, { x: 200, y: 140 }, { x: 400, y: 150 })   // nejbližší zeď je horní
    expect(path[0]).toEqual({ x: 200, y: 3 })
  })

  it('trasa v jedné místnosti nikdy neprotíná střed místnosti', () => {
    const via = wallPipeRoute(wp(100, 0), wp(300, 300), A, A, 14, [A], PIPE_WALL_OFFSET)!
    const inner = via.slice(1, -1)
    expect(inner.length).toBeGreaterThan(0)
    // každý bod trasy leží na obvodu (aspoň jedna souřadnice těsně u zdi)
    for (const p of via) {
      const nearWall = Math.min(p.x - 0, 400 - p.x, p.y - 0, 300 - p.y)
      expect(nearWall).toBeLessThanOrEqual(PIPE_WALL_OFFSET + 0.1)
    }
    expect(via.every(p => p.z === 14)).toBe(true)
  })

  it('mezi místnostmi vede přes sdílenou zeď a po zdech obou místností', () => {
    const from = wp(300, 0), to = wp(710, 300)
    const via = wallPipeRoute(from, to, A, B, 14, [A, B])!
    expect(via).not.toBeNull()
    // přechod mezi místnostmi je v mezeře 400..410 (z x = 397 do x = 413)
    const crossing = via.findIndex((p, i) => i > 0 && p.x > 400 && via[i - 1].x < 400)
    expect(crossing).toBeGreaterThan(0)
    expect(via[crossing - 1].x).toBeCloseTo(397)
    expect(via[crossing].x).toBeCloseTo(413)
    // celá trasa vede po zdech obou místností
    for (const p of via) {
      const nearWall = Math.min(Math.abs(p.x - 0), Math.abs(p.x - 400), Math.abs(p.x - 410), Math.abs(p.x - 810), Math.abs(p.y), Math.abs(p.y - 300))
      expect(nearWall).toBeLessThanOrEqual(PIPE_WALL_OFFSET + 0.1)
    }
  })

  it('místnosti bez společné zdi: žádná trasa po stěnách (použije se běžná)', () => {
    const far = room('c', 2000)
    expect(wallPipeRoute(wp(100, 0), wp(2100, 0), A, far, 14, [A, far])).toBeNull()
  })

  it('přes prostřední místnost: A, B a C za sebou', () => {
    const C = room('c', 820)
    const via = wallPipeRoute(wp(100, 0), wp(1100, 0), A, C, 14, [A, B, C])!
    const xs = via.map(p => Math.round(p.x))
    expect(xs).toEqual(expect.arrayContaining([397, 413, 807, 823]))   // průchod z A do B a z B do C
    expect(via[via.length - 1].x).toBeGreaterThan(800)
  })
})
