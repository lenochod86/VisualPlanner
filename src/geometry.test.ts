import { describe, expect, it } from 'vitest'
import { edgeInfo, moveEdge, setEdgeLength, shapePts } from './geometry'

describe('geometry', () => {
  const r = shapePts('rect', 0, 0, 400, 300)
  it('změní délku stěny a drží obdélník', () => {
    const n = setEdgeLength(r, 0, 500)
    expect(edgeInfo(n, 0).len).toBe(500)
    expect(edgeInfo(n, 1).len).toBe(300)
    expect(edgeInfo(n, 2).len).toBe(500)
  })
  it('posune stěnu', () => {
    const n = moveEdge(r, 2, 400)
    expect(edgeInfo(n, 1).len).toBe(400)
  })
  it('odmítne zdegenerování', () => {
    expect(moveEdge(r, 2, 5)).toBe(r)
  })
  it('L tvar má 6 vrcholů', () => {
    expect(shapePts('L-left', 0, 0, 400, 300)).toHaveLength(6)
  })
})
