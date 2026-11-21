import { beforeEach, describe, expect, it } from 'vitest'
import { electricPosition } from '../geometry/electric'
import { useProjectStore } from './projectStore'
import { clearHistory, undo } from './history'

const state = () => useProjectStore.getState()

describe('přípojky vody k umyvadlu a sprše', () => {
  let roomId: string

  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    clearHistory()
    roomId = state().addRoom('rect')
  })

  it('umyvadlo přidá SV, TUV a odpad na zeď za ním', () => {
    state().addFurniture('sink', roomId)
    const names = state().electric.map(p => `${p.kind}:${p.name}`).sort()
    expect(names).toEqual(['drain:Odpad Umyvadlo', 'tap:SV Umyvadlo', 'tap:TUV Umyvadlo'])
    const sink = state().furniture[0]
    for (const p of state().electric) {
      expect(p.roomId).toBe(roomId)
      expect(p.attach?.edge).toBe(sink.attach?.edge)                         // všechno na stěně, u které umyvadlo stojí
    }
    expect(state().electric.find(p => p.name.startsWith('SV'))!.height).toBe(55)
    expect(state().electric.find(p => p.name.startsWith('Odpad'))!.height).toBe(50)
  })

  it('teplá a studená voda jsou od sebe 20 cm, odpad uprostřed mezi nimi', () => {
    state().addFurniture('sink', roomId)
    const room = state().rooms[0]
    const at = (prefix: string) => electricPosition(state().electric.find(p => p.name.startsWith(prefix))!, room)
    const hot = at('TUV'), cold = at('SV'), drain = at('Odpad')
    expect(Math.hypot(hot.x - cold.x, hot.y - cold.y)).toBeCloseTo(20)
    expect(drain.x).toBeCloseTo((hot.x + cold.x) / 2)
    expect(drain.y).toBeCloseTo((hot.y + cold.y) / 2)
  })

  it('sprchový kout přidá SV a TUV na zeď (výška 110 cm) a odpad volně v podlaze pod vaničkou', () => {
    state().addFurniture('shower', roomId)
    const taps = state().electric.filter(p => p.kind === 'tap')
    expect(taps).toHaveLength(2)
    expect(taps.every(p => p.height === 110 && p.attach)).toBe(true)
    const drain = state().electric.find(p => p.kind === 'drain')!
    expect(drain.snapToWalls).toBe(false)
    expect(drain.attach).toBeUndefined()
    expect(drain.height).toBe(3)
    const shower = state().furniture[0]
    const room = state().rooms[0]
    const center = { x: room.pts[0].x + shower.attach!.along, y: room.pts[0].y + shower.d / 2 }   // u horní zdi
    expect(drain.x).toBeCloseTo(center.x)
    expect(drain.y).toBeCloseTo(center.y)
  })

  it('ostatní nábytek vodu nepřidává a celé přidání je jeden krok zpět', () => {
    state().addFurniture('sofa', roomId)
    expect(state().electric).toHaveLength(0)
    clearHistory()
    state().addFurniture('sink', roomId)
    expect(state().electric).toHaveLength(3)
    undo()
    expect(state().furniture).toHaveLength(1)                     // zbyde jen dřív přidaná pohovka
    expect(state().electric).toHaveLength(0)
  })
})
