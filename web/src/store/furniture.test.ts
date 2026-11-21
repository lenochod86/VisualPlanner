import { beforeEach, describe, expect, it } from 'vitest'
import { clearHistory, undo } from './history'
import { useProjectStore } from './projectStore'

const state = () => useProjectStore.getState()

describe('nábytek ve store', () => {
  let roomId: string
  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    clearHistory()
    roomId = state().addRoom('rect')
  })

  it('přidá postel 80×200 s výchozími rozměry, připnutou ke zdi', () => {
    const id = state().addFurniture('bed-single', roomId)!
    const bed = state().furniture.find(f => f.id === id)!
    expect([bed.w, bed.d]).toEqual([80, 200])
    expect(bed.attach?.edge).toBe(0)
  })

  it('smazání místnosti smaže i její nábytek', () => {
    state().addFurniture('sofa', roomId)
    state().deleteRoom(roomId)
    expect(state().furniture).toHaveLength(0)
  })

  it('volný nábytek se posouvá s místností', () => {
    const id = state().addFurniture('table', roomId)!
    state().updateFurniture(id, { attach: undefined, x: 100, y: 100 })
    state().moveRoom(roomId, 50, 20)
    expect(state().furniture[0]).toMatchObject({ x: 150, y: 120 })
  })

  it('otočení postele u zdi o 90° ji nechá u zdi bokem, rozměry se nemění a jde vrátit zpět', () => {
    const id = state().addFurniture('bed-single', roomId)!
    const before = state().furniture[0]
    state().rotateFurniture(id)
    const bed = state().furniture[0]
    expect([bed.w, bed.d]).toEqual([80, 200])           // rozměry zůstaly
    expect(bed.attach?.turn).toBe(1)                     // pořád u zdi, jen bokem
    expect(bed.keepRotation).toBe(true)
    undo()
    expect(state().furniture[0]).toEqual(before)
  })

  it('natočení jde zadat na libovolný úhel a Shift+R vrací zpět', () => {
    const id = state().addFurniture('sofa', roomId)!
    state().setFurnitureRotation(id, 30)               // 30° není rovnoběžné se zdí: uvolní se a stojí volně
    expect(state().furniture[0].attach).toBeUndefined()
    expect(state().furniture[0].rot).toBeCloseTo((30 * Math.PI) / 180)
    state().rotateFurniture(id, -90)
    expect(state().furniture[0].rot).toBeCloseTo((-60 * Math.PI) / 180)
  })
})

describe('spotřebiče', () => {
  it('přidá pračku, sušičku a lednici s výchozími rozměry a připne je ke zdi', () => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    const room = state().addRoom('rect')
    for (const [kind, w, d, h] of [['washer', 60, 60, 85], ['dryer', 60, 60, 85], ['fridge', 60, 65, 185]] as const) {
      const id = state().addFurniture(kind, room)!
      expect(state().furniture.find(f => f.id === id)).toMatchObject({ kind, w, d, h, attach: { edge: 0 } })
    }
  })
})

describe('digestoř a pevné body', () => {
  it('digestoř visí nad linkou: výška spodní hrany 150 cm', () => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    const room = state().addRoom('rect')
    const id = state().addFurniture('hood', room)!
    expect(state().furniture.find(f => f.id === id)).toMatchObject({ kind: 'hood', w: 60, d: 50, h: 75, elev: 150 })
  })

  it('přidá kruhový a obdélníkový pevný bod s výchozími rozměry', () => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    const room = state().addRoom('rect')
    const round = state().addObstacle('fixed-round', room)!
    const rect = state().addObstacle('fixed-rect', room)!
    expect(state().obstacles.find(o => o.id === round)).toMatchObject({ kind: 'fixed-round', w: 30, d: 30, h: 260 })
    expect(state().obstacles.find(o => o.id === round)!.attach).toBeUndefined()    // volně uprostřed místnosti, ne u zdi
    expect(state().obstacles.find(o => o.id === rect)).toMatchObject({ kind: 'fixed-rect', w: 40, d: 30, h: 260 })
  })
})

describe('pevný bod: zrušení přichycení ke zdi', () => {
  it('vypnutí uvolní prvek stojící u zdi a nechá ho na místě', () => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    const room = state().addRoom('rect')
    const id = state().addObstacle('riser', room)!                    // stoupačka se přidá ke zdi
    expect(state().obstacles[0].attach).toBeDefined()
    const before = { x: 0, y: 0 }
    state().setObstacleSnapToWalls(id, false)
    const after = state().obstacles.find(o => o.id === id)!
    expect(after.snapToWalls).toBe(false)
    expect(after.attach).toBeUndefined()
    expect(Number.isFinite(after.x) && Number.isFinite(after.y)).toBe(true)
    expect(after.y).toBeGreaterThan(before.y)                         // stojí tam, kde byl: u horní zdi (uvnitř místnosti)
    state().setObstacleSnapToWalls(id, true)
    expect(state().obstacles.find(o => o.id === id)!.snapToWalls).toBe(true)
  })
})
