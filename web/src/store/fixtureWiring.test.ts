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

describe('přípojky patří k nábytku', () => {
  let roomId: string
  const names = () => state().electric.map(p => p.name).sort()

  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    clearHistory()
    roomId = state().addRoom('rect')
  })

  const at = (prefix: string) => {
    const point = state().electric.find(p => p.name.startsWith(prefix))!
    return electricPosition(point, state().rooms.find(r => r.id === point.roomId)!)
  }

  it('při posunu umyvadla podél zdi se přípojky posunou s ním', () => {
    state().addFurniture('sink', roomId)
    const sink = state().furniture[0]
    const before = at('TUV')
    state().updateFurniture(sink.id, { attach: { ...sink.attach!, along: sink.attach!.along + 80 } })
    const after = at('TUV')
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeCloseTo(80)
    // odpad zůstává uprostřed mezi SV a TUV
    const hot = at('TUV'), cold = at('SV'), drain = at('Odpad')
    expect(drain.x).toBeCloseTo((hot.x + cold.x) / 2)
  })

  it('při přesunu na jinou stěnu se přípojky přepnou na tu stěnu', () => {
    state().addFurniture('sink', roomId)
    const sink = state().furniture[0]
    state().updateFurniture(sink.id, { attach: { ...sink.attach!, edge: 2, along: 150 } })     // dolní stěna
    for (const p of state().electric) expect(p.attach?.edge).toBe(2)
  })

  it('sprchová vanička s odtokem v podlaze: odtok jede s ní', () => {
    state().addFurniture('shower', roomId)
    const shower = state().furniture[0]
    const before = state().electric.find(p => p.kind === 'drain')!
    state().updateFurniture(shower.id, { attach: { ...shower.attach!, along: shower.attach!.along + 60 } })
    const after = state().electric.find(p => p.kind === 'drain')!
    expect(after.x - before.x).toBeCloseTo(60)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('otočení kolem zdi a změna rozměru přípojky přepočítají', () => {
    state().addFurniture('sink', roomId)
    const sink = state().furniture[0]
    const before = at('SV')
    state().updateFurniture(sink.id, { w: 100, attach: { ...sink.attach!, along: sink.attach!.along + 20 } })
    expect(at('SV').x).not.toBeCloseTo(before.x)
  })

  it('ruční úpravy (výška, název) zůstanou a potrubí z přípojky se přetrasuje', () => {
    state().addFurniture('sink', roomId)
    const sink = state().furniture[0]
    const tap = state().electric.find(p => p.name.startsWith('SV'))!
    const drain = state().electric.find(p => p.name.startsWith('Odpad'))!
    state().updateElectric(tap.id, { height: 60, name: 'SV moje' })
    const pipeId = state().addCable(tap.id, drain.id, 'pipe-cold')!
    state().updateFurniture(sink.id, { attach: { ...sink.attach!, along: sink.attach!.along + 100 } })
    const moved = state().electric.find(p => p.id === tap.id)!
    expect(moved).toMatchObject({ height: 60, name: 'SV moje' })
    expect(state().cables.find(c => c.id === pipeId)).toBeDefined()
  })

  it('smazání nábytku smaže i jeho přípojky a potrubí z nich', () => {
    state().addFurniture('sink', roomId)
    const [a, b] = state().electric
    state().addCable(a.id, b.id, 'pipe-cold')
    state().deleteFurniture(state().furniture[0].id)
    expect(state().electric).toHaveLength(0)
    expect(state().cables).toHaveLength(0)
    expect(names()).toEqual([])
  })

  it('odpojený bod už s nábytkem nejede', () => {
    state().addFurniture('sink', roomId)
    const sink = state().furniture[0]
    const tap = state().electric.find(p => p.name.startsWith('SV'))!
    state().updateElectric(tap.id, { fixtureId: undefined, fixtureRole: undefined })
    const before = at('SV')
    state().updateFurniture(sink.id, { attach: { ...sink.attach!, along: sink.attach!.along + 80 } })
    expect(at('SV')).toEqual(before)
    expect(state().electric.filter(p => p.fixtureId === sink.id)).toHaveLength(2)             // ostatní přípojky jedou dál
  })
})
