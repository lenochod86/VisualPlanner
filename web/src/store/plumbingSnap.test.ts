import { beforeEach, describe, expect, it } from 'vitest'
import { dragElectricPatch, electricPosition } from '../geometry/electric'
import { useProjectStore } from './projectStore'

const state = () => useProjectStore.getState()

describe('body vody: přichycení ke zdi', () => {
  let roomId: string

  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    roomId = state().addRoom('rect')
  })

  it('výtok se přidá na zeď, odpadní stoupačka volně doprostřed místnosti', () => {
    const tapId = state().addElectric('tap', roomId)!
    const sewerId = state().addElectric('sewer', roomId)!
    const tap = state().electric.find(p => p.id === tapId)!
    const sewer = state().electric.find(p => p.id === sewerId)!
    expect(tap.attach).toBeDefined()
    expect(sewer.attach).toBeUndefined()
    expect(sewer.snapToWalls).toBe(false)
  })

  it('vypnutí přichycení uvolní bod na zdi a nechá ho na místě', () => {
    const id = state().addElectric('tap', roomId)!
    const before = electricPosition(state().electric[0], state().rooms[0])
    state().setElectricSnapToWalls(id, false)
    const point = state().electric.find(p => p.id === id)!
    expect(point.attach).toBeUndefined()
    expect(point.snapToWalls).toBe(false)
    const after = electricPosition(point, state().rooms[0])
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('bez přichycení se bod při tažení ke zdi nepřilepí, s přichycením ano', () => {
    const id = state().addElectric('drain', roomId)!
    const room = state().rooms[0]
    const cursor = { x: room.pts[0].x + 150, y: room.pts[0].y + 2 }       // těsně u horní zdi
    expect(dragElectricPatch(state().electric.find(p => p.id === id)!, state().rooms, cursor).attach).toBeDefined()
    state().setElectricSnapToWalls(id, false)
    const free = dragElectricPatch(state().electric.find(p => p.id === id)!, state().rooms, cursor)
    expect(free.attach).toBeUndefined()
    expect(free.x).toBeDefined()
  })
})
