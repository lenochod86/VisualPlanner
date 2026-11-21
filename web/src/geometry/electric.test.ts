import { describe, expect, it } from 'vitest'
import { DEFAULT_CEILING } from '../domain/materials'
import type { Cable, ElectricPoint, Room } from '../domain/types'
import { autoRoute, boardSize, cablePolyline, dragElectricPatch, electricPosition, polylineLength, runHeight } from './electric'
import { shapePts } from './shapes'

const room = (id: string, x: number, ceiling = {}): Room => ({
  id, name: id, type: 'other', pts: shapePts('rect', x, 0, 400, 300), walls: [10, 10, 10, 10], height: 260,
  wallMaterials: ['plaster', 'plaster', 'plaster', 'plaster'], wallModes: ['auto', 'auto', 'auto', 'auto'], ceiling: { ...DEFAULT_CEILING, ...ceiling },
})
const A = room('A', 0), B = room('B', 410)

const socket: ElectricPoint = {
  id: 's', roomId: 'A', kind: 'socket', name: '', x: 0, y: 0, height: 30, attach: { edge: 0, along: 100 },
}
const light: ElectricPoint = { id: 'l', roomId: 'B', kind: 'light', name: '', x: 600, y: 150, height: 0 }

describe('poloha bodů', () => {
  it('nástěnná zásuvka leží na stěně ve své výšce a míří do místnosti', () => {
    const p = electricPosition(socket, A)
    expect(p).toMatchObject({ x: 100, y: 0, z: 30, rot: 0 })
  })

  it('světlo je ve výšce stropu; u SDK podhledu níž', () => {
    expect(electricPosition(light, room('B', 410)).z).toBe(260)
    expect(electricPosition(light, room('B', 410, { type: 'sdk', drop: 10 })).z).toBe(250)
  })

  it('tažení zásuvky ke zdi jiné místnosti ji přepne do té místnosti', () => {
    const patch = dragElectricPatch(socket, [A, B], { x: 600, y: 20 })
    expect(patch.roomId).toBe('B')
    expect(patch.attach?.edge).toBe(0)
  })
})

describe('trasování', () => {
  it('vedení je 30 cm pod stropem, u SDK nad deskou podhledu', () => {
    expect(runHeight(A)).toBe(230)
    expect(runHeight(A, room("X", 0, { type: "sdk", drop: 10 }))).toBe(230)   // min(230, 253)
  })

  it('trasa jde nahoru, vodorovně s jedním kolénkem uvnitř bytu a dolů', () => {
    const from = electricPosition(socket, A)                 // (100, 0, 30)
    const to = electricPosition(light, B)                    // (600, 150, 260)
    const via = autoRoute(from, to, 230, [A, B])
    expect(via[0]).toEqual({ x: 100, y: 0, z: 230 })
    expect(via).toHaveLength(3)                              // nahoru, kolénko, nad světlem
    expect(via[1].z).toBe(230)
    expect(via.every(p => p.z === 230)).toBe(true)
  })

  it('přímá trasa nemá kolénko', () => {
    const via = autoRoute({ x: 0, y: 0, z: 30 }, { x: 0, y: 200, z: 30 }, 230, [A])
    expect(via).toEqual([{ x: 0, y: 0, z: 230 }, { x: 0, y: 200, z: 230 }])
  })

  it('délka trasy je součet úseků ve 3D', () => {
    expect(polylineLength([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 100 }, { x: 300, y: 400, z: 100 }])).toBe(600)
  })

  it('cablePolyline spojí konce s mezilehlými body, bez konce vrátí null', () => {
    const cable: Cable = { id: 'c', type: 'cyky-3x1.5', circuit: '', fromId: 's', toId: 'l', via: [{ x: 100, y: 0, z: 230 }] }
    expect(cablePolyline(cable, [socket, light], [A, B])).toHaveLength(3)
    expect(cablePolyline({ ...cable, toId: 'nic' }, [socket, light], [A, B])).toBeNull()
  })
})

describe('rozvaděč', () => {
  const board: ElectricPoint = {
    id: 'b', roomId: 'A', kind: 'board', name: '', x: 0, y: 0, height: 150, attach: { edge: 0, along: 200 },
  }

  it('má výchozí rozměry a zadané je přebijí', () => {
    expect(boardSize(board)).toEqual({ w: 40, h: 60, d: 12 })
    expect(boardSize({ ...board, w: 60, h: 90 })).toEqual({ w: 60, h: 90, d: 12 })
  })

  it('výška od podlahy je spodní hrana, kabel se připojuje na horní hraně', () => {
    expect(electricPosition(board, A).z).toBe(210)                    // 150 + 60
    expect(electricPosition({ ...board, h: 90 }, A).z).toBe(240)
  })

  it('široký rozvaděč se nepustí blíž ke konci zdi, než aby se vešel', () => {
    const p = electricPosition({ ...board, w: 100, attach: { edge: 0, along: 10 } }, A)
    expect(p.x).toBe(50)                                              // střed nejméně půl šířky od rohu
  })

  it('zásuvce zůstává zadaná výška (střed) beze změny', () => {
    expect(electricPosition(socket, A).z).toBe(30)
  })
})
