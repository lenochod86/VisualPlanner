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
