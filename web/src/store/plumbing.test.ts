import { beforeEach, describe, expect, it } from 'vitest'
import { buildElectricReport } from '../report/electricReport'
import { selectProject, useProjectStore } from './projectStore'
import { canEditInMode, modeOf } from './uiStore'

const state = () => useProjectStore.getState()

describe('vodoinstalace', () => {
  let roomId: string, tap: string, drain: string, socket: string

  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    roomId = state().addRoom('rect')
    tap = state().addElectric('tap', roomId)!
    drain = state().addElectric('drain', roomId)!
    socket = state().addElectric('socket', roomId)!
  })

  it('body vodoinstalace jsou na zdi v katalogové výšce', () => {
    expect(state().electric.find(p => p.id === tap)).toMatchObject({ kind: 'tap', height: 85 })
    expect(state().electric.find(p => p.id === tap)!.attach).toBeDefined()
    expect(state().electric.find(p => p.id === drain)).toMatchObject({ kind: 'drain', height: 40 })
  })

  it('potrubí spojí jen body vodoinstalace, kabel jen elektro body', () => {
    expect(state().addCable(tap, drain, 'pipe-drain-50')).not.toBeNull()
    expect(state().addCable(tap, socket, 'pipe-cold')).toBeNull()            // potrubí do zásuvky nevede
    expect(state().addCable(socket, tap, 'cyky-3x2.5')).toBeNull()           // kabel k výtoku také ne
  })

  it('potrubí se vede při podlaze, ne pod stropem, a od výtoku neklesá', () => {
    const id = state().addCable(tap, drain, 'pipe-cold')!
    const pipe = state().cables.find(c => c.id === id)!
    expect(pipe.circuit).toBe('Rozvod 1')
    expect(pipe.via.length).toBeGreaterThan(0)
    expect(pipe.via.every(w => w.z === 14)).toBe(true)                       // studená voda ve výšce 14 cm
  })

  it('Přetrasovat vše nesahá na potrubí', () => {
    const id = state().addCable(tap, drain, 'pipe-cold')!
    state().updateCable(id, { via: [{ x: 1, y: 2, z: 3 }] })                 // ruční úprava trasy
    state().autoConnectAndRerouteAll()
    expect(state().cables.find(c => c.id === id)!.via).toEqual([{ x: 1, y: 2, z: 3 }])
  })

  it('bilance elektra a vody jsou oddělené', () => {
    state().addCable(tap, drain, 'pipe-drain-50')
    const project = selectProject(state())
    const water = buildElectricReport(project, 'plumbing')
    expect(water.totals.tap).toBe(1)
    expect(water.totals.socket).toBe(0)
    expect(water.types[0]).toMatchObject({ type: 'pipe-drain-50', cables: 1 })
    expect(buildElectricReport(project, 'electro').types).toHaveLength(0)
    expect(buildElectricReport(project, 'electro').totals.socket).toBe(1)
  })

  it('vodoinstalaci upravuje záložka Vodoinstalace, elektro záložka Elektro', () => {
    expect(modeOf('electric', { point: 'tap' })).toBe('plumbing')
    expect(modeOf('electric', { point: 'socket' })).toBe('electro')
    expect(modeOf('cable', { line: 'pipe-hot' })).toBe('plumbing')
    expect(modeOf('cable', { line: 'cyky-3x1.5' })).toBe('electro')
    expect(canEditInMode('electric', 'electro', { point: 'tap' })).toBe(false)
    expect(canEditInMode('electric', 'plumbing', { point: 'tap' })).toBe(true)
  })
})
