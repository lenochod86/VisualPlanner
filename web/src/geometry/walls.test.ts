import { DEFAULT_CEILING } from '../domain/materials'
import { describe, expect, it } from 'vitest'
import type { Room } from '../domain/types'
import { edgeInfo } from './polygon'
import { shapePts } from './shapes'
import { applyWallThickness, buildWallModel, outerPolygon, wallQuad } from './walls'

const room = (id: string, x: number): Room => ({
  id, name: id, type: 'other', pts: shapePts('rect', x, 0, 400, 300), walls: [10, 10, 10, 10], height: 260, wallMaterials: ['plaster', 'plaster', 'plaster', 'plaster'], wallModes: ['auto', 'auto', 'auto', 'auto'], ceiling: { ...DEFAULT_CEILING },
})
// A: x 0..400, B: x 415..815 -> mezera 15 = sdílená zeď tloušťky 15 (pravá stěna A = index 1, levá B = index 3)
const A = room('A', 0), B = room('B', 415)

describe('walls', () => {
  it('pozná sdílenou zeď a vezme tloušťku z mezery', () => {
    const model = buildWallModel([A, B])
    expect(model.info('A', 1)).toMatchObject({ thickness: 15, partners: [{ roomId: 'B', edge: 3 }], visible: true })
    expect(model.info('A', 3)).toMatchObject({ thickness: 10, partners: [] })
  })

  it('vzdálené místnosti zeď nesdílí', () => {
    expect(buildWallModel([A, room('C', 600)]).info('A', 1).partners).toEqual([])
  })

  it('změna sdílené zdi drží osu: obě místnosti ustoupí o půl změny', () => {
    const next = applyWallThickness([A, B], 'A', 1, 25)!
    const model = buildWallModel(next)
    expect(model.info('A', 1).thickness).toBe(25)
    const [a, b] = next
    expect(edgeInfo(a.pts, 1).a.x).toBe(395) // 400 - 5
    expect(edgeInfo(b.pts, 3).a.x).toBe(420) // 415 + 5
  })

  it('obvodová zeď mění jen tloušťku, místnost zůstane', () => {
    const next = applyWallThickness([A, B], 'A', 3, 30)!
    expect(next[0].walls[3]).toBe(30)
    expect(next[0].pts).toEqual(A.pts)
  })

  it('odmítne změnu, která by místnost zdegenerovala', () => {
    expect(applyWallThickness([A, B], 'A', 1, 795)).toBeNull()
  })

  it('vnější obrys respektuje tloušťky jednotlivých zdí', () => {
    const outer = outerPolygon(A.pts, [10, 20, 10, 30])
    expect(outer[0]).toEqual({ x: -30, y: -10 })   // levý horní roh: vlevo 30, nahoře 10
    expect(outer[2]).toEqual({ x: 420, y: 310 })
  })
})

describe('stěny uvnitř jiné místnosti (kout)', () => {
  const big = room('A', 0)
  const nook: Room = { ...room('N', 0), pts: shapePts('rect', 200, 100, 100, 100) }   // kout uvnitř místnosti A

  it('automaticky je skrytá každá stěna kouta, vnější stěny místnosti ne', () => {
    const model = buildWallModel([big, nook])
    expect([0, 1, 2, 3].map(i => model.info('N', i).visible)).toEqual([false, false, false, false])
    expect(model.info('N', 0).containedIn).toEqual(['A'])
    expect(model.visibility(big)).toEqual([true, true, true, true])
  })

  it('režim "plná" stěnu ukáže, "skrytá" skryje i obvodovou', () => {
    const solid = { ...nook, wallModes: ['solid', 'auto', 'auto', 'auto'] as Room['wallModes'] }
    expect(buildWallModel([big, solid]).info('N', 0).visible).toBe(true)
    const hiddenOuter = { ...big, wallModes: ['hidden', 'auto', 'auto', 'auto'] as Room['wallModes'] }
    expect(buildWallModel([hiddenOuter]).info('A', 0).visible).toBe(false)
  })

  it('kout vedle zdi (sdílená zeď) zůstává viditelný', () => {
    const next = room('B', 415)   // mezera 15 od A: sdílená zeď, B není uvnitř A
    expect(buildWallModel([big, next]).info('B', 3).visible).toBe(true)
  })
})

describe('wallQuad: konec zdi u skryté sousední stěny', () => {
  const pts = shapePts('rect', 200, 100, 100, 100)
  const t = [10, 10, 10, 10]

  it('všechny stěny viditelné: konce jsou v pokosu (zdi do sebe zapadají)', () => {
    const quad = wallQuad(pts, t, [true, true, true, true], 0)
    expect(quad[2]).toEqual({ x: 310, y: 90 })          // vnější roh, jako u celé zdi
    expect(quad[3]).toEqual({ x: 190, y: 90 })
  })

  it('jen horní stěna viditelná: konce jsou rovné, ne šikmé', () => {
    const quad = wallQuad(pts, t, [true, false, false, false], 0)
    expect(quad).toEqual([{ x: 200, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 90 }, { x: 200, y: 90 }])
  })
})
