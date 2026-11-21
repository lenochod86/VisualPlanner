import { describe, expect, it } from 'vitest'
import { canEditInMode } from './uiStore'

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
