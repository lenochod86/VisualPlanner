import { describe, expect, it } from 'vitest'
import { FURNITURE_CATEGORIES, FURNITURE_KINDS } from '../../domain/furnitureCatalog'
import type { FurnitureKind } from '../../domain/types'
import { FURNITURE_MODELS } from './furnitureModels'

const kinds = Object.keys(FURNITURE_KINDS) as FurnitureKind[]

describe('katalog nábytku a 3D modely', () => {
  it.each(kinds)('%s má model se správnými rozsahy a zařazení do existující kategorie', kind => {
    const parts = FURNITURE_MODELS[kind]
    expect(parts.length).toBeGreaterThan(0)
    for (const p of parts) {
      for (const range of [p.x, p.y, p.z]) {
        expect(range[0]).toBeLessThan(range[1])                       // část má kladný rozměr
        expect(range[0]).toBeGreaterThanOrEqual(-0.001)
        expect(range[1]).toBeLessThanOrEqual(1.03)                    // trčí nejvýš pár milimetrů (madla, okénko)
      }
    }
    expect(FURNITURE_CATEGORIES[FURNITURE_KINDS[kind].category]).toBeDefined()
  })

  it('spotřebiče mají běžné rozměry', () => {
    expect(FURNITURE_KINDS.washer).toMatchObject({ w: 60, d: 60, h: 85, category: 'appliances' })
    expect(FURNITURE_KINDS.dryer).toMatchObject({ w: 60, d: 60, h: 85, category: 'appliances' })
    expect(FURNITURE_KINDS.fridge).toMatchObject({ w: 60, d: 65, h: 185, category: 'appliances' })
  })

  it('okénko pračky a sušičky je kruh (stejný průměr na šířku i na výšku při výchozích rozměrech)', () => {
    for (const kind of ['washer', 'dryer'] as const) {
      const { w, h } = FURNITURE_KINDS[kind]
      const window = FURNITURE_MODELS[kind].filter(p => p.shape === 'cylz')[0]
      expect((window.x[1] - window.x[0]) * w).toBeCloseTo((window.y[1] - window.y[0]) * h, 0)
    }
  })
})
