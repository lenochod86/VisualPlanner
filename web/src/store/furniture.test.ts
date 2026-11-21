import { beforeEach, describe, expect, it } from 'vitest'
import { clearHistory, undo } from './history'
import { useProjectStore } from './projectStore'

const state = () => useProjectStore.getState()

describe('nábytek ve store', () => {
  let roomId: string
  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [] })
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

  it('otočení na zdi prohodí rozměry a jde vrátit zpět', () => {
    const id = state().addFurniture('bed-single', roomId)!
    state().rotateFurniture(id)
    expect([state().furniture[0].w, state().furniture[0].d]).toEqual([200, 80])
    undo()
    expect([state().furniture[0].w, state().furniture[0].d]).toEqual([80, 200])
  })
})
