import { describe, expect, it } from 'vitest'
import { centroid, edgeInfo, moveEdge, polygonArea, setEdgeLength } from './polygon'
import { shapePts } from './shapes'

describe('polygon', () => {
  const rect = shapePts('rect', 0, 0, 400, 300)

  it('změní délku stěny a drží obdélník', () => {
    const n = setEdgeLength(rect, 0, 500)
    expect(edgeInfo(n, 0).len).toBe(500)
    expect(edgeInfo(n, 1).len).toBe(300)
    expect(edgeInfo(n, 2).len).toBe(500)
  })

  it('posune stěnu', () => {
    expect(edgeInfo(moveEdge(rect, 2, 400), 1).len).toBe(400)
  })

  it('odmítne zdegenerování', () => {
    expect(moveEdge(rect, 2, 5)).toBe(rect)
  })

  it('L tvar má 6 vrcholů a menší plochu než obdélník', () => {
    const l = shapePts('L-left', 0, 0, 400, 300)
    expect(l).toHaveLength(6)
    expect(polygonArea(l)).toBeLessThan(polygonArea(rect))
  })

  it('těžiště obdélníku je ve středu', () => {
    expect(centroid(rect)).toEqual({ x: 200, y: 150 })
  })
})
