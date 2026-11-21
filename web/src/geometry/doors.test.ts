import { describe, expect, it } from 'vitest'
import { doorSwing, swingSectorPoints } from './doors'

describe('doorSwing', () => {
  it('výchozí dveře: závěs vlevo, otevírají se do místnosti', () => {
    const s = doorSwing({ w: 90 }, 10)
    expect(s.hinge).toEqual({ x: -45, y: 5 })              // líc zdi uvnitř místnosti
    expect(s.closedEnd).toEqual({ x: 45, y: 5 })
    expect(s.openEnd).toEqual({ x: -45, y: 95 })           // křídlo kolmo do místnosti
  })

  it('pravé dveře mají závěs na druhé straně', () => {
    const s = doorSwing({ w: 90, hinge: 'right' }, 10)
    expect(s.hinge.x).toBe(45)
    expect(s.openEnd).toEqual({ x: 45, y: 95 })
  })

  it('dveře otevírané ven mají oblouk na druhé straně zdi', () => {
    const s = doorSwing({ w: 90, swing: 'out' }, 10)
    expect(s.hinge.y).toBe(-5)
    expect(s.openEnd.y).toBe(-95)
  })

  it('otočení o 180° (závěs i směr naopak) dává zrcadlově obrácený oblouk', () => {
    const a = doorSwing({ w: 90 }, 10)
    const b = doorSwing({ w: 90, hinge: 'right', swing: 'out' }, 10)
    expect(b.openEnd).toEqual({ x: -a.openEnd.x, y: -a.openEnd.y })
    expect(b.sweep).toBe(a.sweep)                           // otočení o 180° směr oblouku nemění
  })

  it('směr oblouku se mění se stranou závěsu', () => {
    expect(doorSwing({ w: 90 }, 10).sweep).not.toBe(doorSwing({ w: 90, hinge: 'right' }, 10).sweep)
  })

  it('obvod výseče začíná závěsem a končí u otevřeného křídla', () => {
    const s = doorSwing({ w: 90 }, 10)
    const pts = swingSectorPoints(s)
    expect(pts[0]).toEqual(s.hinge)
    const last = pts[pts.length - 1]
    expect(last.x).toBeCloseTo(s.openEnd.x)
    expect(last.y).toBeCloseTo(s.openEnd.y)
  })
})
