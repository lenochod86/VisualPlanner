import type { MultiPolygon } from 'polygon-clipping'
import { describe, expect, it } from 'vitest'
import type { Obstacle, Pt, Room } from '../../domain/types'
import { buildOpenings } from '../../geometry/openings'
import { containsPoint } from '../../geometry/polygon'
import { shapePts } from '../../geometry/shapes'
import { buildWallModel } from '../../geometry/walls'
import { roomWallFootprint, wallBands } from './wallGeometry'

const room = (id: string, x: number): Room => ({
  id, name: id, type: 'other', pts: shapePts('rect', x, 0, 400, 300), walls: [10, 10, 10, 10], height: 260,
})

const toPts = (ring: [number, number][]): Pt[] => ring.map(([x, y]) => ({ x, y }))
/** Leží bod v pevné části (vnější okruh ano, díra ne)? */
const solidAt = (mp: MultiPolygon, p: Pt) =>
  mp.some(([outer, ...holes]) => containsPoint(toPts(outer), p) && !holes.some(h => containsPoint(toPts(h), p)))

describe('půdorys zdí po místnostech', () => {
  const rooms = [room('A', 0), room('B', 410)]   // sdílená zeď: x 400..410
  const walls = buildWallModel(rooms)

  it('sdílená zeď patří jen jedné místnosti (té dřívější)', () => {
    const shared = { x: 405, y: 150 }
    expect(solidAt(roomWallFootprint(rooms, 0, walls), shared)).toBe(true)
    expect(solidAt(roomWallFootprint(rooms, 1, walls), shared)).toBe(false)
  })

  it('obvodová zeď každé místnosti zůstane její', () => {
    expect(solidAt(roomWallFootprint(rooms, 1, walls), { x: 815, y: 150 })).toBe(true) // vnější zeď B vpravo (x 810..820)
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
  const footprint = roomWallFootprint(rooms, 0, walls)

  it('okno rozdělí zeď na 3 pásy a prostřední je proříznutý', () => {
    const bands = wallBands(footprint, 260, buildOpenings(rooms, [window_], walls))
    expect(bands.map(b => [b.z0, b.z1])).toEqual([[0, 90], [90, 230], [230, 260]])
    expect(solidAt(bands[0].footprint, { x: 200, y: -5 })).toBe(true)    // pod oknem zeď je
    expect(solidAt(bands[1].footprint, { x: 200, y: -5 })).toBe(false)   // v okně ne
    expect(solidAt(bands[1].footprint, { x: 100, y: -5 })).toBe(true)    // vedle okna ano
  })

  it('dveře jdou od podlahy: pod nimi není zeď, nad nimi je', () => {
    const bands = wallBands(footprint, 260, buildOpenings(rooms, [door], walls))
    expect(bands.map(b => [b.z0, b.z1])).toEqual([[0, 205], [205, 260]])
    expect(solidAt(bands[0].footprint, { x: 200, y: -5 })).toBe(false)
    expect(solidAt(bands[1].footprint, { x: 200, y: -5 })).toBe(true)
  })

  it('bez otvorů je zeď jeden pás přes celou výšku', () => {
    expect(wallBands(footprint, 260, []).map(b => [b.z0, b.z1])).toEqual([[0, 260]])
  })
})
