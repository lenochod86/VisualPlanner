import { beforeEach, describe, expect, it } from 'vitest'
import { clearHistory, undo } from './history'
import { useProjectStore } from './projectStore'

const state = () => useProjectStore.getState()

describe('elektro ve store', () => {
  let roomId: string
  let socketId: string
  let lightId: string

  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    clearHistory()
    roomId = state().addRoom('rect')
    socketId = state().addElectric('socket', roomId)!
    lightId = state().addElectric('light', roomId)!
  })

  it('zásuvka je na zdi ve výchozí výšce, světlo na stropě', () => {
    const socket = state().electric.find(p => p.id === socketId)!
    expect(socket.height).toBe(30)
    expect(socket.attach).toBeDefined()
    expect(state().electric.find(p => p.id === lightId)!.attach).toBeUndefined()
  })

  it('kabel mezi dvěma body dostane automatickou trasu', () => {
    const id = state().addCable(socketId, lightId, 'cyky-3x1.5')!
    const cable = state().cables.find(c => c.id === id)!
    expect(cable.via.length).toBeGreaterThanOrEqual(2)
    expect(cable.via[0].z).toBe(230)          // výška vedení: 30 cm pod stropem 260
  })

  it('kabel do sebe samého se nevytvoří', () => {
    expect(state().addCable(socketId, socketId, 'cyky-3x1.5')).toBeNull()
  })

  it('vytvoření kabelu i trasování je jeden krok v undo', async () => {
    const { beginGesture, endGesture } = await import('./history')
    beginGesture(); state().addCable(socketId, lightId, 'cyky-3x2.5'); endGesture()
    expect(state().cables).toHaveLength(1)
    undo()
    expect(state().cables).toHaveLength(0)
  })

  it('smazání bodu smaže i jeho kabely, smazání místnosti všechno', () => {
    state().addCable(socketId, lightId, 'cyky-3x1.5')
    state().deleteElectric(lightId)
    expect(state().cables).toHaveLength(0)

    state().addCable(socketId, state().addElectric('switch', roomId)!, 'cyky-3x1.5')
    state().deleteRoom(roomId)
    expect(state().electric).toHaveLength(0)
    expect(state().cables).toHaveLength(0)
  })

  it('body trasy jdou vkládat, upravovat a mazat', () => {
    const id = state().addCable(socketId, lightId, 'cyky-3x1.5')!
    const before = state().cables[0].via.length
    state().insertWaypoint(id, 1, { x: 1, y: 2, z: 3 })
    expect(state().cables[0].via[1]).toEqual({ x: 1, y: 2, z: 3 })
    state().updateWaypoint(id, 1, { z: 99 })
    expect(state().cables[0].via[1].z).toBe(99)
    state().deleteWaypoint(id, 1)
    expect(state().cables[0].via).toHaveLength(before)
  })
})
