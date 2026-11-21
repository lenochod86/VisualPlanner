import { describe, expect, it } from 'vitest'
import { floorColor, FLOOR_MATERIALS, tileHeight, wallColor } from './finishes'
import { DEFAULT_CEILING } from './materials'
import type { Room } from './types'

const room: Room = {
  id: 'r', name: 'Koupelna', type: 'bathroom', pts: [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 200 }, { x: 0, y: 200 }],
  walls: [10, 10, 10, 10], height: 260, wallMaterials: ['plaster', 'tile', 'plaster', 'plaster'],
  wallModes: ['auto', 'auto', 'auto', 'auto'], ceiling: { ...DEFAULT_CEILING },
}

describe('povrchy', () => {
  it('bez nastavení se podlaha kreslí barvou podle typu místnosti', () => {
    expect(floorColor(room)).toBe('#b9e0e6')
  })

  it('podlaha: barva materiálu, nebo vlastní barva', () => {
    expect(floorColor({ ...room, floor: { material: 'tile' } })).toBe(FLOOR_MATERIALS.tile.color)
    expect(floorColor({ ...room, floor: { material: 'tile', color: '#123456' } })).toBe('#123456')
  })

  it('stěna: barva materiálu, nebo vlastní barva u dané stěny', () => {
    expect(wallColor(room, 0)).toBe('#f4f1ea')
    expect(wallColor(room, 1)).toBe('#cfe3e8')                                  // obklad
    expect(wallColor({ ...room, wallColors: [null, '#ff0000', null, null] }, 1)).toBe('#ff0000')
    expect(wallColor({ ...room, wallColors: [null, '#ff0000', null, null] }, 0)).toBe('#f4f1ea')
  })

  it('výška obkladu: výchozí 200 cm, nejvýš po strop, aspoň 10 cm', () => {
    expect(tileHeight(room)).toBe(200)
    expect(tileHeight({ ...room, tileHeight: 150 })).toBe(150)
    expect(tileHeight({ ...room, tileHeight: 999 })).toBe(260)
    expect(tileHeight({ ...room, tileHeight: 0 })).toBe(10)
  })
})
