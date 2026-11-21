import { beforeEach, describe, expect, it } from 'vitest'
import { selectProject, useProjectStore } from '../store/projectStore'
import { buildCeilingReport } from './ceilingReport'
import { availablePages, buildPlanPages } from './planSvg'
import { buildSummaryPages, summaryTables } from './summarySvg'

const state = () => useProjectStore.getState()

describe('soupis SDK podhledů a závěrečná stránka', () => {
  let roomId: string

  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    roomId = state().addRoom('rect')                      // 400 × 300
  })

  const makeSdk = () => state().updateRoom(roomId, { ceiling: { ...state().rooms[0].ceiling, type: 'sdk' } })

  it('bez SDK podhledu je soupis profilů prázdný', () => {
    expect(buildCeilingReport(selectProject(state())).rooms).toEqual([])
  })

  it('CD profily = nosné + příčné po rastru, UD = obvod, kusy po 3 m s rezervou', () => {
    makeSdk()
    const { rooms, totals } = buildCeilingReport(selectProject(state()))
    expect(rooms).toHaveLength(1)
    expect(rooms[0].areaM2).toBeCloseTo(12)
    expect(rooms[0].perimeterM).toBeCloseTo(14)
    // 7 nosných řad po 4 m (rozteč 40) + 4 příčné po 3 m (rozteč 100) = 28 + 12
    expect(totals.cdM).toBeCloseTo(40)
    expect(totals.udM).toBeCloseTo(14)
    expect(totals.cdPieces).toBe(15)                       // 40 m × 1,1 / 3 m = 14,7
    expect(totals.udPieces).toBe(6)                        // 14 m × 1,1 / 3 m = 5,1
  })

  it('soupis obsahuje elektro, vodu i SDK a je poslední stránkou', () => {
    makeSdk()
    const socket = state().addElectric('socket', roomId)!
    const board = state().addElectric('board', roomId)!
    state().addCable(board, socket, 'cyky-3x2.5')
    const tap = state().addElectric('tap', roomId)!
    const drain = state().addElectric('drain', roomId)!
    state().addCable(tap, drain, 'pipe-drain-50')

    const titles = summaryTables(selectProject(state())).map(t => t.title)
    expect(titles).toEqual(expect.arrayContaining(['Elektro: body', 'Elektro: kabely', 'Vodoinstalace: body', 'Vodoinstalace: potrubí', 'SDK podhled: k nákupu']))

    const project = selectProject(state())
    expect(availablePages(project)).toEqual(['plan', 'electro', 'plumbing', 'summary'])
    const pages = buildPlanPages(project, { title: 'Byt', date: '1. 1. 2027' }, availablePages(project))
    expect(pages.map(p => p.kind)).toEqual(['plan', 'electro', 'plumbing', 'summary'])
    const last = pages[pages.length - 1]
    expect(last.svg).toContain('CD 60/27')
    expect(last.svg).toContain('UD 28/27')
    // všechny listy mají stejný formát
    expect(new Set(pages.map(p => `${p.pageWidth}x${p.pageHeight}`)).size).toBe(1)
  })

  it('dlouhý soupis pokračuje na další stránce', () => {
    for (let i = 0; i < 100; i++) state().addRoom('rect')
    state().rooms.forEach(r => state().updateRoom(r.id, { ceiling: { ...r.ceiling, type: 'sdk' } }))
    expect(buildSummaryPages(selectProject(state()), { title: 'Byt', date: 'x' }, 297, 210).length).toBeGreaterThan(1)
  })

  it('stránka vodoinstalace nekreslí elektro a naopak', () => {
    state().addElectric('socket', roomId)
    const tap = state().addElectric('tap', roomId)!
    const drain = state().addElectric('drain', roomId)!
    state().addCable(tap, drain, 'pipe-hot')
    const project = selectProject(state())
    const [, electro, plumbing] = buildPlanPages(project, { title: 'Byt', date: 'x' }, ['plan', 'electro', 'plumbing'])
    expect(plumbing.svg).toContain('#d9342b')              // barva teplé vody
    expect(electro.svg).not.toContain('#d9342b')
  })
})
