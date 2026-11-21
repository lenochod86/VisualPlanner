import { describe, expect, it } from 'vitest'
import type { Room } from '../../domain/types'
import { shapePts } from '../../geometry/shapes'
import { buildWallModel } from '../../geometry/walls'
import { wallFootprint } from './wallGeometry'

const room = (id: string, x: number): Room => ({
  id, name: id, type: 'other', pts: shapePts('rect', x, 0, 400, 300), walls: [10, 10, 10, 10], height: 260,
})

describe('wallFootprint', () => {
  it('sousedící místnosti se sdílenou zdí tvoří jedno těleso se dvěma otvory', () => {
    const rooms = [room('A', 0), room('B', 410)]
    const footprint = wallFootprint(rooms, buildWallModel(rooms))
    expect(footprint).toHaveLength(1)
    expect(footprint[0]).toHaveLength(1 + 2) // vnější okruh + díra pro každou místnost
  })

  it('vzdálené místnosti mají zdi odděleně', () => {
    const rooms = [room('A', 0), room('B', 900)]
    expect(wallFootprint(rooms, buildWallModel(rooms))).toHaveLength(2)
  })
})
