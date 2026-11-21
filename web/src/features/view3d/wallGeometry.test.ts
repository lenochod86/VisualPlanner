import type { MultiPolygon } from 'polygon-clipping'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CEILING } from '../../domain/materials'
import type { Obstacle, Pt, Room } from '../../domain/types'
import { buildOpenings } from '../../geometry/openings'
import { containsPoint } from '../../geometry/polygon'
import { shapePts } from '../../geometry/shapes'
import { buildWallModel } from '../../geometry/walls'
import { buildWallPieces, wallBands } from './wallGeometry'

const room = (id: string, x: number): Room => ({
  id, name: id, type: 'other', pts: shapePts('rect', x, 0, 400, 300), walls: [10, 10, 10, 10], height: 260,
  wallMaterials: ['plaster', 'plaster', 'plaster', 'plaster'], ceiling: { ...DEFAULT_CEILING },
})

const toPts = (ring: [number, number][]): Pt[] => ring.map(([x, y]) => ({ x, y }))
/** Leží bod v pevné části (vnější okruh ano, díra ne)? */
const solidAt = (mp: MultiPolygon, p: Pt) =>
  mp.some(([outer, ...holes]) => containsPoint(toPts(outer), p) && !holes.some(h => containsPoint(toPts(h), p)))

/** Kdo vlastní bod: [id místnosti, index stěny] nebo null. */
function ownerAt(rooms: Room[], p: Pt) {
  const pieces = buildWallPieces(rooms, buildWallModel(rooms))
  return pieces.filter(piece => solidAt(piece.footprint, p)).map(piece => `${piece.roomId}:${piece.edge}`)
}

describe('kusy zdí po stěnách', () => {
  const rooms = [room('A', 0), room('B', 410)]   // sdílená zeď: x 400..410

  it('sdílená zeď je rozdělená uprostřed: každá místnost má polovinu na své straně', () => {
    expect(ownerAt(rooms, { x: 402, y: 150 })).toEqual(['A:1'])   // blíž k A (pravá stěna)
    expect(ownerAt(rooms, { x: 408, y: 150 })).toEqual(['B:3'])   // blíž k B (levá stěna)
  })

  it('každý bod zdi patří nejvýš jednomu kusu (žádné překryvy)', () => {
    for (const p of [{ x: 405, y: 150 }, { x: -5, y: -5 }, { x: 405, y: -5 }, { x: 405, y: 305 }, { x: 200, y: -5 }]) {
      expect(ownerAt(rooms, p).length).toBeLessThanOrEqual(1)
    }
  })

  it('obvodová zeď patří své stěně', () => {
    expect(ownerAt(rooms, { x: 815, y: 150 })).toEqual(['B:1'])
    expect(ownerAt(rooms, { x: 200, y: -5 })).toEqual(['A:0'])
  })

  it('uvnitř místnosti zeď není', () => {
    expect(ownerAt(rooms, { x: 200, y: 150 })).toEqual([])
  })
})

describe('otvory ve zdech', () => {
  const rooms = [room('A', 0)]
  const walls = buildWallModel(rooms)
  const base: Omit<Obstacle, 'id' | 'kind' | 'w' | 'h' | 'elev'> = {
    roomId: 'A', d: 12, x: 0, y: 0, rot: 0, attach: { edge: 0, along: 200 },   // horní stěna, střed
  }
  const window_: Obstacle = { ...base, id: 'w', kind: 'window', w: 100, h: 140, elev: 90 }
  const door: Obstacle = { ...base, id: 'd', kind: 'door', w: 90, h: 205, elev: 0 }
  const topWall = buildWallPieces(rooms, walls).find(p => p.edge === 0)!.footprint

  it('okno rozdělí zeď na 3 pásy a prostřední je proříznutý', () => {
    const bands = wallBands(topWall, 260, buildOpenings(rooms, [window_], walls))
    expect(bands.map(b => [b.z0, b.z1])).toEqual([[0, 90], [90, 230], [230, 260]])
    expect(solidAt(bands[0].footprint, { x: 200, y: -5 })).toBe(true)    // pod oknem zeď je
    expect(solidAt(bands[1].footprint, { x: 200, y: -5 })).toBe(false)   // v okně ne
    expect(solidAt(bands[1].footprint, { x: 100, y: -5 })).toBe(true)    // vedle okna ano
  })

  it('dveře jdou od podlahy: pod nimi není zeď, nad nimi je', () => {
    const bands = wallBands(topWall, 260, buildOpenings(rooms, [door], walls))
    expect(bands.map(b => [b.z0, b.z1])).toEqual([[0, 205], [205, 260]])
    expect(solidAt(bands[0].footprint, { x: 200, y: -5 })).toBe(false)
    expect(solidAt(bands[1].footprint, { x: 200, y: -5 })).toBe(true)
  })

  it('otvor se vyřízne jako dveře (od podlahy), ale bez výplně', () => {
    const opening: Obstacle = { ...base, id: 'o', kind: 'opening', w: 100, h: 205, elev: 0 }
    const bands = wallBands(topWall, 260, buildOpenings(rooms, [opening], walls))
    expect(bands.map(b => [b.z0, b.z1])).toEqual([[0, 205], [205, 260]])
    expect(solidAt(bands[0].footprint, { x: 200, y: -5 })).toBe(false)
  })

  it('bez otvorů je zeď jeden pás přes celou výšku', () => {
    expect(wallBands(topWall, 260, []).map(b => [b.z0, b.z1])).toEqual([[0, 260]])
  })
})
