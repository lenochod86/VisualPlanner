import { describe, expect, it } from 'vitest'
import { DEFAULT_CEILING } from '../domain/materials'
import type { Cable, ElectricPoint, Room } from '../domain/types'
import { autoRoute, boardSize, cablePolyline, dragElectricPatch, electricPosition, planAutoConnections, polylineLength, runHeight } from './electric'
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
    const to = electricPosition(light, B)                    // (600, 150, 260): světlo na stropě
    const via = autoRoute(from, to, 230, [A, B])
    expect(via[0]).toEqual({ x: 100, y: 0, z: 260 })         // vedení se zvedne až ke stropu, kde je světlo
    expect(via).toHaveLength(2)                              // nahoru a kolénko; nad světlem už je trasa přímo ve výšce světla
    expect(via.every(p => p.z === 260)).toBe(true)
  })

  it('kabel od světla na stropě nejdřív neklesá: vede se po stropě, ne 30 cm pod ním', () => {
    const via = autoRoute({ x: 0, y: 0, z: 260 }, { x: 300, y: 200, z: 105 }, 230, [A])
    expect(via.every(p => p.z === 260)).toBe(true)
  })

  it('vedení pod stropem platí, když jsou oba konce níž (zásuvky)', () => {
    const via = autoRoute({ x: 0, y: 0, z: 30 }, { x: 300, y: 0, z: 30 }, 230, [A])
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

describe('planAutoConnections', () => {
  const at = (id: string, kind: ElectricPoint['kind'], x: number, y: number, extra: Partial<ElectricPoint> = {}): ElectricPoint =>
    ({ id, roomId: 'A', kind, name: '', x, y, height: 30, ...extra })
  const cable = (fromId: string, toId: string, circuit = 'C1'): Cable =>
    ({ id: fromId + toId, type: 'cyky-3x2.5', circuit, fromId, toId, via: [] })

  it('nenapojené zásuvky se spojí mezi sebou, světla mezi sebou', () => {
    const electric = [at('s1', 'socket', 50, 0), at('s2', 'socket', 150, 0), at('l1', 'light', 100, 100), at('l2', 'light', 300, 100)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [] })
    expect(plan).toHaveLength(2)
    expect(plan.find(c => c.type === 'cyky-3x2.5')).toMatchObject({ fromId: 's1', toId: 's2' })
    expect(plan.find(c => c.type === 'cyky-3x1.5')).toMatchObject({ fromId: 'l1', toId: 'l2' })
  })

  it('řetězí se podle nejbližšího souseda (ne všechny na jeden bod)', () => {
    const electric = [at('a', 'light', 0, 100), at('b', 'light', 100, 100), at('c', 'light', 200, 100), at('d', 'light', 300, 100)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [] })
    expect(plan.map(c => [c.fromId, c.toId])).toEqual([['a', 'b'], ['b', 'c'], ['c', 'd']])
  })

  it('už napojené body se nemění; nový se napojí na nejbližší napojený a převezme okruh', () => {
    const electric = [at('s1', 'socket', 50, 0), at('s2', 'socket', 150, 0), at('s3', 'socket', 190, 0)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [cable('s1', 's2', 'Obývák')] })
    expect(plan).toEqual([{ fromId: 's2', toId: 's3', type: 'cyky-3x2.5', circuit: 'Obývák' }])
  })

  it('bod napojený kabelem na něco jiného (třeba vypínač) se už nenapojuje', () => {
    const electric = [at('s1', 'socket', 50, 0), at('s2', 'socket', 150, 0), at('sw', 'switch', 0, 0)]
    expect(planAutoConnections({ rooms: [A], electric, cables: [cable('s1', 'sw'), cable('s2', 'sw')] })).toEqual([])
  })

  it('jediný bod ve skupině nemá s čím spojit a bez nenapojených nic neplánuje', () => {
    expect(planAutoConnections({ rooms: [A], electric: [at('l1', 'light', 100, 100)], cables: [] })).toEqual([])
  })

  it('nový okruh dostane jedinečný název', () => {
    const electric = [at('s1', 'socket', 50, 0), at('s2', 'socket', 150, 0)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [{ ...cable('x', 'y', 'Zásuvky'), id: 'q' }] })
    expect(plan[0].circuit).toBe('Zásuvky 2')
  })
})

describe('planAutoConnections: primárně k rozvaděči', () => {
  const at = (id: string, kind: ElectricPoint['kind'], x: number, y: number): ElectricPoint =>
    ({ id, roomId: 'A', kind, name: '', x, y, height: 30 })
  const board: ElectricPoint = { id: 'rozv', roomId: 'A', kind: 'board', name: '', x: 0, y: 0, height: 150, attach: { edge: 3, along: 150 } }

  it('nejbližší bod se napojí na rozvaděč a od něj se řetězí další', () => {
    const electric = [board, at('far', 'light', 300, 100), at('near', 'light', 60, 100), at('mid', 'light', 180, 100)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [] })
    expect(plan.map(c => [c.fromId, c.toId])).toEqual([['rozv', 'near'], ['near', 'mid'], ['mid', 'far']])
  })

  it('jediná zásuvka se napojí na rozvaděč, ne na nic', () => {
    const plan = planAutoConnections({ rooms: [A], electric: [board, at('s', 'socket', 100, 0)], cables: [] })
    expect(plan).toEqual([{ fromId: 'rozv', toId: 's', type: 'cyky-3x2.5', circuit: 'Zásuvky' }])
  })

  it('řetězené body převezmou okruh, každý nový odvod z rozvaděče má vlastní okruh', () => {
    const electric = [board, at('s1', 'socket', 60, 100), at('s2', 'socket', 120, 100), at('l1', 'light', 80, 0)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [] })
    const socketCircuits = plan.filter(c => c.type === 'cyky-3x2.5').map(c => c.circuit)
    expect(new Set(socketCircuits).size).toBe(1)               // s1 z rozvaděče, s2 z s1 -> jeden okruh
    expect(plan.find(c => c.type === 'cyky-3x1.5')!.circuit).toBe('Světla')
  })

  it('místnost už napojená na rozvaděč: nová zásuvka se řetězí na její zásuvku a převezme okruh', () => {
    const existing: Cable = { id: 'x', type: 'cyky-3x2.5', circuit: 'Kuchyň', fromId: 'rozv', toId: 's1', via: [] }
    const electric = [board, at('s1', 'socket', 60, 100), at('s2', 'socket', 120, 100)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [existing] })
    expect(plan).toEqual([{ fromId: 's1', toId: 's2', type: 'cyky-3x2.5', circuit: 'Kuchyň' }])
  })

  it('okruh sporáku (kabel jiného typu) se jako cíl nepoužije: nová zásuvka jde k rozvaděči', () => {
    const cooker: Cable = { id: 'x', type: 'cyky-5x4', circuit: 'Sporák', fromId: 'rozv', toId: 's1', via: [] }
    const electric = [board, at('s1', 'socket', 60, 100), at('s2', 'socket', 120, 100)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [cooker] })
    expect(plan).toEqual([{ fromId: 'rozv', toId: 's2', type: 'cyky-3x2.5', circuit: 'Zásuvky' }])
  })
})

describe('planAutoConnections: vypínače a světla', () => {
  const at = (id: string, kind: ElectricPoint['kind'], x: number, y: number, roomId = 'A'): ElectricPoint =>
    ({ id, roomId, kind, name: '', x, y, height: 105 })
  const board: ElectricPoint = { id: 'rozv', roomId: 'A', kind: 'board', name: '', x: 0, y: 0, height: 150, attach: { edge: 3, along: 150 } }

  it('vypínače se napojí každý přímo na rozvaděč', () => {
    const electric = [board, at('v1', 'switch', 100, 0), at('v2', 'switch', 300, 0)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [] })
    expect(plan.map(c => [c.fromId, c.toId])).toEqual([['rozv', 'v1'], ['rozv', 'v2']])
    expect(new Set(plan.map(c => c.circuit)).size).toBe(2)           // každý odvod z rozvaděče = vlastní okruh
  })

  it('světlo se napojí na nejbližší vypínač a převezme jeho okruh', () => {
    const electric = [board, at('v1', 'switch', 50, 0), at('v2', 'switch', 350, 0), at('l1', 'light', 320, 150), at('l2', 'light', 80, 150)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [] })
    const toV2 = plan.find(c => c.toId === 'l1')!
    const toV1 = plan.find(c => c.toId === 'l2')!
    expect([toV2.fromId, toV1.fromId]).toEqual(['v2', 'v1'])
    const viaCircuit = (id: string) => plan.find(c => c.toId === id)!.circuit
    expect(toV2.circuit).toBe(viaCircuit('v2'))
    expect(toV1.circuit).toBe(viaCircuit('v1'))
    expect(toV2.circuit).not.toBe(toV1.circuit)
  })

  it('víc světel na jeden vypínač se nezřetězí mezi sebou, všechna jdou na vypínač', () => {
    const electric = [board, at('v', 'switch', 50, 0), at('l1', 'light', 100, 100), at('l2', 'light', 250, 100)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [] })
    expect(plan.filter(c => c.type === 'cyky-3x1.5' && c.toId.startsWith('l')).map(c => c.fromId)).toEqual(['v', 'v'])
  })

  it('bez vypínačů se světla napojují jako dřív: k rozvaděči a řetězově', () => {
    const electric = [board, at('l1', 'light', 60, 100), at('l2', 'light', 160, 100)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [] })
    expect(plan.map(c => [c.fromId, c.toId])).toEqual([['rozv', 'l1'], ['l1', 'l2']])
  })

  it('už napojené světlo se znovu nenapojuje', () => {
    const electric = [board, at('v', 'switch', 50, 0), at('l1', 'light', 100, 100)]
    const done: Cable = { id: 'x', type: 'cyky-3x1.5', circuit: 'Ložnice', fromId: 'v', toId: 'l1', via: [] }
    expect(planAutoConnections({ rooms: [A], electric, cables: [done] }).some(c => c.toId === 'l1')).toBe(false)
  })

  it('přednostně napojuje v rámci téže místnosti', () => {
    const room2: Room = { ...A, id: 'B' }
    const electric = [board, at('vA', 'switch', 300, 0, 'A'), at('vB', 'switch', 60, 0, 'B'), at('l', 'light', 80, 100, 'A')]
    const plan = planAutoConnections({ rooms: [A, room2], electric, cables: [] })
    expect(plan.find(c => c.toId === 'l')!.fromId).toBe('vA')          // vB je blíž, ale v jiné místnosti
  })
})

describe('planAutoConnections: zásuvky po místnostech', () => {
  const B: Room = { ...A, id: 'B' }
  const board: ElectricPoint = { id: 'rozv', roomId: 'A', kind: 'board', name: '', x: 0, y: 0, height: 150, attach: { edge: 3, along: 150 } }
  const sock = (id: string, x: number, y: number, roomId: string): ElectricPoint =>
    ({ id, roomId, kind: 'socket', name: '', x, y, height: 30 })

  it('každá místnost má svůj odvod z rozvaděče a zásuvky různých místností se nespojují mezi sebou', () => {
    const electric = [board, sock('a1', 50, 50, 'A'), sock('a2', 120, 50, 'A'), sock('b1', 500, 50, 'B'), sock('b2', 560, 50, 'B')]
    const plan = planAutoConnections({ rooms: [A, B], electric, cables: [] })
    const roomOf = (id: string) => electric.find(p => p.id === id)!.roomId
    for (const c of plan.filter(c => c.fromId !== 'rozv')) expect(roomOf(c.fromId)).toBe(roomOf(c.toId))
    expect(plan.filter(c => c.fromId === 'rozv').map(c => c.toId).sort()).toEqual(['a1', 'b1'])   // nejbližší v každé místnosti
    expect(plan.find(c => c.toId === 'a2')!.fromId).toBe('a1')
    expect(plan.find(c => c.toId === 'b2')!.fromId).toBe('b1')
  })

  it('k rozvaděči se v místnosti napojí přímo jen nejbližší zásuvka, i když je jiná blíž k rozvaděči než k řetězu', () => {
    // rozvaděč je ve (0, 150): r1 je nejblíž; r2 je k němu blíž než r3, ale přímo se k němu už nenapojuje
    const electric = [board, sock('r1', 20, 140, 'A'), sock('r2', 40, 60, 'A'), sock('r3', 300, 200, 'A')]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [] })
    expect(plan.filter(c => c.fromId === 'rozv')).toHaveLength(1)
    expect(plan.find(c => c.fromId === 'rozv')!.toId).toBe('r1')
    expect(plan.find(c => c.toId === 'r2')!.fromId).toBe('r1')       // ostatní se řetězí na body téže místnosti
  })

  it('bez rozvaděče se v každé místnosti začne od vlastní zásuvky a místnosti se nespojí', () => {
    const electric = [sock('a1', 50, 50, 'A'), sock('a2', 120, 50, 'A'), sock('b1', 500, 50, 'B'), sock('b2', 560, 50, 'B')]
    const plan = planAutoConnections({ rooms: [A, B], electric, cables: [] })
    expect(plan.map(c => [c.fromId, c.toId].sort().join('-')).sort()).toEqual(['a1-a2', 'b1-b2'])
  })
})

describe('planAutoConnections: jen vybraný bod', () => {
  const board: ElectricPoint = { id: 'rozv', roomId: 'A', kind: 'board', name: '', x: 0, y: 0, height: 150, attach: { edge: 3, along: 150 } }
  const sock = (id: string, x: number, y: number): ElectricPoint => ({ id, roomId: 'A', kind: 'socket', name: '', x, y, height: 30 })

  it('napojí jen zadaný bod, ostatní nenapojené nechá být', () => {
    const electric = [board, sock('a', 50, 100), sock('b', 150, 100), sock('c', 250, 100)]
    const plan = planAutoConnections({ rooms: [A], electric, cables: [] }, ['b'])
    expect(plan).toEqual([{ fromId: 'rozv', toId: 'b', type: 'cyky-3x2.5', circuit: 'Zásuvky' }])
  })

  it('nová zásuvka v napojené místnosti se řetězí na nejbližší hotovou zásuvku', () => {
    const electric = [board, sock('a', 50, 100), sock('b', 150, 100), sock('c', 190, 100)]
    const cables: Cable[] = [
      { id: '1', type: 'cyky-3x2.5', circuit: 'Obývák', fromId: 'rozv', toId: 'a', via: [] },
      { id: '2', type: 'cyky-3x2.5', circuit: 'Obývák', fromId: 'a', toId: 'b', via: [] },
    ]
    expect(planAutoConnections({ rooms: [A], electric, cables }, ['c']))
      .toEqual([{ fromId: 'b', toId: 'c', type: 'cyky-3x2.5', circuit: 'Obývák' }])
  })

  it('bod, který už kabel má, se znovu nenapojuje', () => {
    const electric = [board, sock('a', 50, 100)]
    const cables: Cable[] = [{ id: '1', type: 'cyky-3x2.5', circuit: 'x', fromId: 'rozv', toId: 'a', via: [] }]
    expect(planAutoConnections({ rooms: [A], electric, cables }, ['a'])).toEqual([])
  })
})
