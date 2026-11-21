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
    expect(cable.via[0].z).toBe(260)          // světlo je na stropě (260), vedení se zvedne až k němu, ne 30 cm pod strop
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

describe('Přetrasovat vše: napojení a přetrasování', () => {
  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    clearHistory()
  })

  it('napojí nenapojené zásuvky a světla a všechno přetrasuje, hotové kabely nechá', async () => {
    const { beginGesture, endGesture } = await import('./history')
    const room = state().addRoom('rect')
    const s1 = state().addElectric('socket', room)!
    const s2 = state().addElectric('socket', room)!
    const l1 = state().addElectric('light', room)!
    const l2 = state().addElectric('light', room)!
    state().updateElectric(s2, { attach: { edge: 0, along: 300 } })   // zásuvky odděleně (jinak by měly stejnou polohu)
    state().updateElectric(l2, { x: 300, y: 200 })
    const existing = state().addCable(l1, l2, 'cyky-3x1.5')!      // světla už propojená
    state().updateCable(existing, { via: [] })                      // ruční úprava, kterou přetrasování zahodí

    beginGesture()
    const result = state().autoConnectAndRerouteAll()
    endGesture()

    expect(result.added).toBe(1)                                    // jen zásuvky s1 - s2
    expect(state().cables).toHaveLength(2)
    const added = state().cables.find(c => c.id !== existing)!
    expect([added.fromId, added.toId].sort()).toEqual([s1, s2].sort())
    expect(added.type).toBe('cyky-3x2.5')
    expect(state().cables.every(c => c.via.length >= 1)).toBe(true)  // všechny kabely mají novou trasu
    undo()                                                           // celé je to jeden krok
    expect(state().cables).toHaveLength(1)
  })
})

describe('Napojit / přetrasovat automaticky jen u jednoho bodu', () => {
  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    clearHistory()
  })

  it('napojí jen vybraný bod a nechá ostatní kabely beze změny (i s ručními úpravami)', () => {
    const room = state().addRoom('rect')
    const board = state().addElectric('board', room)!
    const s1 = state().addElectric('socket', room)!
    const s2 = state().addElectric('socket', room)!
    state().updateElectric(s1, { attach: { edge: 0, along: 100 } })
    state().updateElectric(s2, { attach: { edge: 0, along: 300 } })
    const first = state().addCable(board, s1, 'cyky-3x2.5')!
    state().updateCable(first, { via: [{ x: 5, y: 5, z: 5 }] })      // ruční úprava, kterou nic jiného nesmí zahodit

    const result = state().autoConnectPoint(s2)

    expect(result.added).toBe(1)
    expect(state().cables).toHaveLength(2)
    expect(state().cables.find(c => c.id === first)!.via).toEqual([{ x: 5, y: 5, z: 5 }])   // první kabel se nedotkl
    const added = state().cables.find(c => c.id !== first)!
    expect([added.fromId, added.toId]).toEqual([s1, s2])             // místnost už je napojená: řetězí se na s1
    expect(added.via.length).toBeGreaterThan(0)                       // a má trasu
  })

  it('bod, který už kabel má, jen přetrasuje své kabely', () => {
    const room = state().addRoom('rect')
    const s1 = state().addElectric('socket', room)!
    const s2 = state().addElectric('socket', room)!
    state().updateElectric(s2, { attach: { edge: 0, along: 300 } })
    const own = state().addCable(s1, s2, 'cyky-3x2.5')!
    const other = state().addCable(s1, s2, 'cyky-3x1.5')!
    state().updateCable(own, { via: [] })
    state().updateCable(other, { via: [{ x: 1, y: 1, z: 1 }] })

    const result = state().autoConnectPoint(s2)

    expect(result.added).toBe(0)
    expect(result.rerouted).toBe(2)                                   // oba kabely se dotýkají tohoto bodu
    expect(state().cables.find(c => c.id === own)!.via.length).toBeGreaterThan(0)
  })
})
