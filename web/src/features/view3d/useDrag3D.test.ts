import { describe, expect, it } from 'vitest'
import { isOccluded } from './useDrag3D'

const wall = (distance: number) => ({ distance, object: { userData: { occluder: true } } })
const thing = (distance: number) => ({ distance, object: { userData: {} } })

describe('isOccluded: lze chytit jen to, co je vidět', () => {
  it('objekt za zdí (zeď je blíž ke kameře) je zakrytý', () => {
    expect(isOccluded([wall(500), thing(700)], 700)).toBe(true)
  })

  it('objekt před zdí zakrytý není', () => {
    expect(isOccluded([thing(400), wall(500)], 400)).toBe(false)
  })

  it('zeď ve stejné vzdálenosti (rám okna v otvoru) objekt nezakrývá', () => {
    expect(isOccluded([wall(700.2), thing(700)], 700)).toBe(false)
  })

  it('jiný objekt (nábytek) před ním ho nezakrývá, rozhoduje nejbližší na řadě', () => {
    expect(isOccluded([thing(300), thing(700)], 700)).toBe(false)
  })

  it('bez zdi v cestě není zakrytý nic', () => {
    expect(isOccluded([], 100)).toBe(false)
  })
})
