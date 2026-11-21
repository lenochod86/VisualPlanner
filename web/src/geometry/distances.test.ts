import { describe, expect, it } from 'vitest'
import { DEFAULT_CEILING } from '../domain/materials'
import type { ElectricPoint, Furniture, Obstacle, Room } from '../domain/types'
import { electricDistances } from './distances'
import { shapePts } from './shapes'

const room: Room = {
  id: 'A', name: 'A', type: 'other', pts: shapePts('rect', 0, 0, 400, 300), walls: [10, 10, 10, 10], height: 260,
  wallMaterials: ['plaster', 'plaster', 'plaster', 'plaster'], wallModes: ['auto', 'auto', 'auto', 'auto'], ceiling: { ...DEFAULT_CEILING },
}
const socket = (along: number): ElectricPoint =>
  ({ id: 's', roomId: 'A', kind: 'socket', name: '', x: 0, y: 0, height: 30, attach: { edge: 0, along } })
const around = (extra: Partial<Parameters<typeof electricDistances>[1]> = {}) =>
  ({ rooms: [room], obstacles: [], furniture: [], electric: [], ...extra })

describe('vzdálenosti zásuvky na zdi', () => {
  it('bez ničeho v okolí měří k oběma koncům zdi', () => {
    const lengths = electricDistances(socket(100), around()).map(l => Math.round(l.length))
    expect(lengths).toEqual([100, 300])
  })

  it('měří k okraji dveří a k okraji nábytku na téže zdi', () => {
    const door: Obstacle = { id: 'd', roomId: 'A', kind: 'door', w: 90, d: 12, h: 205, elev: 0, x: 0, y: 0, rot: 0, attach: { edge: 0, along: 250 } }
    const sofa: Furniture = { id: 'f', roomId: 'A', kind: 'sofa', w: 60, d: 90, h: 85, elev: 0, x: 0, y: 0, rot: 0, attach: { edge: 0, along: 40 } }
    const lengths = electricDistances(socket(130), around({ obstacles: [door], furniture: [sofa] })).map(l => Math.round(l.length))
    // sofa zabírá 10..70 -> vlevo 60 cm; dveře 205..295 -> vpravo 75 cm
    expect(lengths).toEqual([60, 75])
  })

  it('zásuvka za gaučem: měří k jeho okrajům', () => {
    const sofa: Furniture = { id: 'f', roomId: 'A', kind: 'sofa', w: 200, d: 90, h: 85, elev: 0, x: 0, y: 0, rot: 0, attach: { edge: 0, along: 200 } }
    const lengths = electricDistances(socket(150), around({ furniture: [sofa] })).map(l => Math.round(l.length))
    expect(lengths).toEqual([50, 150])                   // gauč 100..300, zásuvka na 150
  })

  it('kóty se kreslí uvnitř místnosti, ne ve zdi', () => {
    const [first] = electricDistances(socket(100), around())
    expect(first.a.y).toBeGreaterThan(0)
  })
})

describe('vzdálenosti stropního světla', () => {
  it('měří ke čtyřem zdem', () => {
    const light: ElectricPoint = { id: 'l', roomId: 'A', kind: 'light', name: '', x: 150, y: 100, height: 0 }
    const lengths = electricDistances(light, around()).map(l => Math.round(l.length)).sort((a, b) => a - b)
    expect(lengths).toEqual([100, 150, 200, 250])        // vlevo 150, vpravo 250, nahoru 100, dolů 200
  })
})
