import { describe, expect, it } from 'vitest'
import type { Obstacle } from '../domain/types'
import { resizeAlongWall } from './obstacles'

const window_: Obstacle & { attach: { edge: number; along: number } } = {
  id: 'w', roomId: 'r', kind: 'window', w: 100, d: 12, h: 140, elev: 90, x: 0, y: 0, rot: 0,
  attach: { edge: 0, along: 200 },   // zabírá 150..250
}

describe('resizeAlongWall', () => {
  it('tažení za pravý konec nechá levý na místě', () => {
    expect(resizeAlongWall(window_, 400, 'end', 300)).toEqual({ w: 150, attach: { edge: 0, along: 225 } })
  })
  it('tažení za levý konec nechá pravý na místě', () => {
    expect(resizeAlongWall(window_, 400, 'start', 100)).toEqual({ w: 150, attach: { edge: 0, along: 175 } })
  })
  it('nepustí okno pod minimální šířku ani za konec stěny', () => {
    expect(resizeAlongWall(window_, 400, 'end', 100).w).toBe(10)
    expect(resizeAlongWall(window_, 400, 'end', 999).attach.along).toBe(275) // konec drží na 400
  })
})
