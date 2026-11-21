import { describe, expect, it } from 'vitest'
import { canEditInMode, restorePanels } from './uiStore'

describe('co se kde smí upravovat', () => {
  it('místnosti a stavební prvky jen v Půdorysu', () => {
    expect(canEditInMode('room', 'plan')).toBe(true)
    expect(canEditInMode('obstacle', 'plan')).toBe(true)
    expect(canEditInMode('obstacle', 'equipment')).toBe(false)
    expect(canEditInMode('obstacle', 'electro')).toBe(false)
  })

  it('nábytek jen ve Vybavení, elektro jen v Elektru', () => {
    expect(canEditInMode('furniture', 'equipment')).toBe(true)
    expect(canEditInMode('furniture', 'plan')).toBe(false)
    expect(canEditInMode('electric', 'electro')).toBe(true)
    expect(canEditInMode('cable', 'electro')).toBe(true)
    expect(canEditInMode('cable', 'equipment')).toBe(false)
  })
})

describe('pamatování sbalených panelů', () => {
  it('obnoví uložené sbalení půdorysu nebo 3D', () => {
    expect(restorePanels({ show3d: false, showPlan: true })).toEqual({ show3d: false, showPlan: true })
    expect(restorePanels({ show3d: true, showPlan: false })).toEqual({ show3d: true, showPlan: false })
  })

  it('bez uložených dat nebo s poškozenými je vše rozbalené', () => {
    expect(restorePanels(undefined)).toEqual({ show3d: true, showPlan: true })
    expect(restorePanels({ show3d: 'ne', showPlan: 5 })).toEqual({ show3d: true, showPlan: true })
  })

  it('nikdy nezůstanou sbalené oba panely', () => {
    expect(restorePanels({ show3d: false, showPlan: false })).toEqual({ show3d: true, showPlan: true })
  })
})
