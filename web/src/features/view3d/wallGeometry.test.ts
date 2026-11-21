import type { MultiPolygon } from 'polygon-clipping'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CEILING } from '../../domain/materials'
import type { Obstacle, Pt, Room } from '../../domain/types'
import { buildOpenings } from '../../geometry/openings'
import { containsPoint } from '../../geometry/polygon'
import { shapePts } from '../../geometry/shapes'
import { buildWallModel } from '../../geometry/walls'
import { buildWallPieces, buildWallSolids, wallBands, wallFacesCamera } from './wallGeometry'

const room = (id: string, x: number): Room => ({
  id, name: id, type: 'other', pts: shapePts('rect', x, 0, 400, 300), walls: [10, 10, 10, 10], height: 260,
  wallMaterials: ['plaster', 'plaster', 'plaster', 'plaster'], wallModes: ['auto', 'auto', 'auto', 'auto'], ceiling: { ...DEFAULT_CEILING },
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

describe('skryté a vynucené stěny', () => {
  const big = room('A', 0)
  const nook: Room = { ...room('N', 0), pts: shapePts('rect', 200, 100, 100, 100) }
  const pieceCount = (rooms: Room[], roomId: string) =>
    buildWallPieces(rooms, buildWallModel(rooms)).filter(p => p.roomId === roomId).length

  it('stěny kouta uvnitř místnosti se ve 3D automaticky nekreslí', () => {
    expect(pieceCount([big, nook], 'N')).toBe(0)
    expect(pieceCount([big, nook], 'A')).toBe(4)
  })

  it('stěna nastavená jako plná se nakreslí i uvnitř jiné místnosti', () => {
    const solid = { ...nook, wallModes: ['solid', 'auto', 'auto', 'auto'] as Room['wallModes'] }
    const rooms = [big, solid]
    expect(pieceCount(rooms, 'N')).toBe(1)
    expect(ownerAt(rooms, { x: 250, y: 95 })).toEqual(['N:0'])   // zeď leží nad horní hranou kouta (y 90..100)
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

describe('wallFacesCamera: přední stěny', () => {
  const wall = { outward: { x: 0, y: -1 }, center: { x: 200, y: 0 } }         // horní stěna, vnější strana míří nahoru (y < 0)

  it('stěna hledí na kameru, když je kamera na její vnější straně', () => {
    expect(wallFacesCamera(wall.outward, wall.center, { x: 200, y: -800 })).toBe(true)
  })

  it('stěna na protější straně (kamera uvnitř / za ní) není přední', () => {
    expect(wallFacesCamera(wall.outward, wall.center, { x: 200, y: 800 })).toBe(false)
  })

  it('stěna kolmá na pohled (kamera naboku) není přední', () => {
    expect(wallFacesCamera(wall.outward, wall.center, { x: 900, y: 0 })).toBe(false)
  })
})

describe('obklad na stěně', () => {
  it('stěna s obkladem se rozdělí na obklad a omítku nad ním; ostatní stěny zůstávají celé', () => {
    const r: Room = { ...room('a', 0), wallMaterials: ['tile', 'plaster', 'plaster', 'plaster'], tileHeight: 150 }
    const solids = buildWallSolids([r], buildWallModel([r]), [])
    const zones = (edge: number) => solids.filter(s => s.edge === edge).map(s => s.zone).sort()
    expect(zones(0)).toEqual(['above-tile', 'tile'])
    expect(zones(1)).toEqual(['wall'])
  })
})
