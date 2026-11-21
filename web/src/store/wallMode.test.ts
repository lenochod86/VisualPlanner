import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from './projectStore'

const state = () => useProjectStore.getState()

describe('režim stěny ve store', () => {
  beforeEach(() => useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] }))

  it('u sdílené zdi se režim nastaví i na straně sousední místnosti', () => {
    const a = state().addRoom('rect')
    const b = state().addRoom('rect')                // vedle A, sdílená zeď (A pravá stěna = 1, B levá = 3)
    state().setWallMode(a, 1, 'hidden')
    const [ra, rb] = state().rooms
    expect(ra.wallModes[1]).toBe('hidden')
    expect(rb.wallModes[3]).toBe('hidden')
    expect(rb.wallModes[0]).toBe('auto')
    expect(b).toBe(rb.id)
  })
})
