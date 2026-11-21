import { beforeEach, describe, expect, it } from 'vitest'
import { selectProject, useProjectStore } from '../store/projectStore'
import { buildElectricReport, reportToCsv } from './electricReport'

const state = () => useProjectStore.getState()
const report = () => buildElectricReport(selectProject(state()))

describe('bilance elektra', () => {
  let roomId: string, socketId: string, lightId: string

  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    roomId = state().addRoom('rect')                 // 400 × 300, výška 260
    socketId = state().addElectric('socket', roomId)!   // na horní stěně uprostřed, ve výšce 30
    lightId = state().addElectric('light', roomId)!     // uprostřed místnosti na stropě
    state().addElectric('socket', roomId)
  })

  it('spočítá body podle místností a celkem', () => {
    const r = report()
    expect(r.rooms[0].counts.socket).toBe(2)
    expect(r.rooms[0].counts.light).toBe(1)
    expect(r.totals.socket).toBe(2)
  })

  it('délka kabelu = nahoru ve zdi, vodorovně, dolů ke světlu', () => {
    state().addCable(socketId, lightId, 'cyky-3x1.5')
    // zásuvka je ve čtvrtině horní stěny (100, 0, 30), světlo uprostřed (200, 150, strop):
    // nahoru 200 + vodorovně 100 + 150 + dolů ke světlu 30 = 480 cm
    const r = report()
    expect(r.totalLengthM).toBeCloseTo(4.8)
    expect(r.types[0]).toMatchObject({ type: 'cyky-3x1.5', cables: 1, orderM: 6 })   // 4,8 × 1,1 = 5,28 -> 6
  })

  it('kabely se stejným okruhem se sečtou', () => {
    const a = state().addCable(socketId, lightId, 'cyky-3x1.5')!
    const b = state().addCable(socketId, lightId, 'cyky-3x1.5')!
    state().updateCable(a, { circuit: 'Obývák' })
    state().updateCable(b, { circuit: 'Obývák' })
    const r = report()
    expect(r.circuits).toHaveLength(1)
    expect(r.circuits[0]).toMatchObject({ circuit: 'Obývák', cables: 2 })
    expect(r.circuits[0].lengthM).toBeCloseTo(9.6)
  })

  it('CSV má BOM, středníky a desetinnou čárku', () => {
    state().addCable(socketId, lightId, 'cyky-3x1.5')
    const csv = reportToCsv(report())
    expect(csv.startsWith('﻿Soupis elektroinstalace')).toBe(true)
    expect(csv).toContain('4,80')
    expect(csv).toContain('Místnost;Zásuvka;')
  })
})
