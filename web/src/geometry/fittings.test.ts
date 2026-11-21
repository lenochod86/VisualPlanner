import { describe, expect, it } from 'vitest'
import { countElbows, countTees, sticksToBuy } from './fittings'

const p = (x: number, y: number, z = 0) => ({ x, y, z })

describe('tvarovky potrubí', () => {
  it('přímá trasa nemá kolena', () => {
    expect(countElbows([p(0, 0), p(100, 0), p(300, 0)])).toEqual({ elbow90: 0, elbow45: 0 })
  })

  it('pravý úhel v půdorysu i svislé zalomení jsou kolena 90°', () => {
    // nahoru, vodorovně, do strany, dolů: čtyři ohyby po 90°
    expect(countElbows([p(0, 0, 40), p(0, 0, 14), p(200, 0, 14), p(200, 100, 14), p(200, 100, 85)])).toEqual({ elbow90: 3, elbow45: 0 })
  })

  it('šikmá odbočka o 45° je koleno 45°', () => {
    expect(countElbows([p(0, 0), p(100, 0), p(200, 100)])).toEqual({ elbow90: 0, elbow45: 1 })
  })

  it('splývající body nejsou ohyb', () => {
    expect(countElbows([p(0, 0), p(100, 0), p(100, 0), p(200, 0)])).toEqual({ elbow90: 0, elbow45: 0 })
  })

  it('T-kus je tam, kde se stýkají aspoň tři trubky', () => {
    expect(countTees([{ fromId: 'a', toId: 'b' }, { fromId: 'a', toId: 'c' }])).toBe(0)                   // jen průchod
    expect(countTees([{ fromId: 'a', toId: 'b' }, { fromId: 'a', toId: 'c' }, { fromId: 'a', toId: 'd' }])).toBe(1)
    expect(countTees([1, 2, 3, 4].map(n => ({ fromId: 'a', toId: `x${n}` })))).toBe(2)
  })

  it('počet trubek: délka s rezervou nahoru na celé kusy (PPR 4 m, HT 50 2 m)', () => {
    expect(sticksToBuy('pipe-cold', 900, 1.1)).toBe(3)        // 9,9 m / 4 m
    expect(sticksToBuy('pipe-drain-50', 400, 1.1)).toBe(3)    // 4,4 m / 2 m
  })
})
