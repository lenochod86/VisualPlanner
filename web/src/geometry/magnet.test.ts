import { describe, expect, it } from 'vitest'
import { magnetEdgeCoord, magnetizeRoom, magnetRoomShift } from './magnet'
import { shapePts } from './shapes'

const A = shapePts('rect', 0, 0, 400, 300)  // pravá stěna A je na x = 400
const WALL = 10

describe('magnet', () => {
  it('přitáhne sousední místnost tak, aby mezi nimi zbyla jedna zeď', () => {
    const b = shapePts('rect', 415, 0, 300, 300)  // mezera 15 místo 10
    expect(magnetRoomShift(b, [A], WALL)).toEqual({ x: -5, y: 0 })
  })

  it('nepřitahuje, když je místnost daleko', () => {
    const b = shapePts('rect', 600, 0, 300, 300)
    expect(magnetRoomShift(b, [A], WALL)).toEqual({ x: 0, y: 0 })
  })

  it('přitáhne taženou stěnu na sdílenou zeď', () => {
    const b = shapePts('rect', 420, 0, 300, 300)
    // levá stěna B (index 3) tažená na x = 415 -> magnet ji dotáhne na 410
    expect(magnetEdgeCoord(b, 3, 415, [A], WALL)).toBe(410)
  })

  it('magnetizeRoom srovná nakreslenou místnost k sousedovi', () => {
    const drawn = shapePts('rect', 405, 5, 200, 200)
    const result = magnetizeRoom(drawn, [A], WALL)
    expect(result[0]).toEqual({ x: 410, y: 0 })
  })
})
