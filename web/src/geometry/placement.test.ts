import { DEFAULT_CEILING } from '../domain/materials'
import { describe, expect, it } from 'vitest'
import type { Placed, Room } from '../domain/types'
import {
  dragFurniturePatch, resizeAlongWall, resolvePlacement, rotatePatch, roomAt,
} from './placement'
import { shapePts } from './shapes'
import { buildWallModel } from './walls'

const room = (id: string, x: number): Room => ({
  id, name: id, type: 'other', pts: shapePts('rect', x, 0, 400, 300), walls: [10, 10, 10, 10], height: 260, wallMaterials: ['plaster', 'plaster', 'plaster', 'plaster'], ceiling: { ...DEFAULT_CEILING },
})
const A = room('A', 0), B = room('B', 500)
const rooms = [A, B]
const walls = buildWallModel(rooms)

const sofa: Placed = { id: 's', roomId: 'A', w: 200, d: 90, h: 85, elev: 0, x: 200, y: 150, rot: 0 }
const onTopWall: Placed = { ...sofa, attach: { edge: 0, along: 200 } }  // horní stěna místnosti A

describe('resolvePlacement', () => {
  it('věc na horní zdi stojí zády ke zdi a míří dolů do místnosti', () => {
    const p = resolvePlacement(onTopWall, A, walls)
    expect(p.x).toBeCloseTo(200)
    expect(p.y).toBeCloseTo(45)           // d/2 od zdi (y = 0)
    expect(p.rot).toBeCloseTo(0)          // lokální "dopředu" (+y) = dolů
  })

  it('po zvětšení místnosti zůstane u zdi', () => {
    const bigger = { ...A, pts: shapePts('rect', 0, 0, 400, 500) }
    const p = resolvePlacement({ ...onTopWall, attach: { edge: 2, along: 200 } }, bigger, buildWallModel([bigger]))
    expect(p.y).toBeCloseTo(500 - 45)     // dolní stěna se posunula, gauč s ní
  })
})

describe('dragFurniturePatch', () => {
  it('blízko zdi se přichytí', () => {
    const patch = dragFurniturePatch(sofa, rooms, walls, { x: 200, y: 50 })  // 50 < 45 + 20
    expect(patch.attach).toEqual({ edge: 0, along: 200 })
  })

  it('uprostřed místnosti stojí volně a drží natočení', () => {
    const patch = dragFurniturePatch({ ...sofa, rot: 1 }, rooms, walls, { x: 200, y: 150 })
    expect(patch).toMatchObject({ attach: undefined, x: 200, y: 150, rot: 1 })
  })

  it('přetažení do jiné místnosti změní roomId', () => {
    const patch = dragFurniturePatch(sofa, rooms, walls, { x: 700, y: 150 })
    expect(patch.roomId).toBe('B')
  })
})

describe('ostatní', () => {
  it('roomAt najde místnost podle bodu', () => {
    expect(roomAt(rooms, { x: 100, y: 100 })?.id).toBe('A')
    expect(roomAt(rooms, { x: 450, y: 100 })).toBeUndefined()   // zeď/mezera
  })

  it('otočení na zdi prohodí šířku a hloubku, volné se natočí o 90°', () => {
    expect(rotatePatch(onTopWall)).toEqual({ w: 90, d: 200 })
    expect(rotatePatch(sofa).rot).toBeCloseTo(Math.PI / 2)
  })

  it('tažení za konec nechá druhý konec na místě a hlídá minimum', () => {
    const w = { ...onTopWall, w: 100, attach: { edge: 0, along: 200 } } // 150..250
    expect(resizeAlongWall(w, 400, 'end', 300)).toEqual({ w: 150, attach: { edge: 0, along: 225 } })
    expect(resizeAlongWall(w, 400, 'end', 100).w).toBe(10)
    expect(resizeAlongWall(w, 400, 'end', 999).attach.along).toBe(275)
  })
})
