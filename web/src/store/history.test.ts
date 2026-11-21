import { beforeEach, describe, expect, it } from 'vitest'
import { beginGesture, clearHistory, endGesture, redo, undo, useHistoryStatus } from './history'
import { useProjectStore } from './projectStore'

const names = () => useProjectStore.getState().rooms.map(r => r.name)

describe('historie (undo/redo)', () => {
  beforeEach(() => {
    useProjectStore.setState({ rooms: [], obstacles: [], furniture: [], electric: [], cables: [] })
    clearHistory()
  })

  it('vrátí a zopakuje přidání místnosti', () => {
    useProjectStore.getState().addRoom('rect')
    expect(names()).toHaveLength(1)
    undo()
    expect(names()).toHaveLength(0)
    redo()
    expect(names()).toHaveLength(1)
  })

  it('celé gesto je jeden krok', () => {
    const id = useProjectStore.getState().addRoom('rect')
    beginGesture()
    for (const dx of [5, 5, 5]) useProjectStore.getState().moveRoom(id, dx, 0)
    endGesture()
    const moved = useProjectStore.getState().rooms[0].pts[0].x
    undo()
    expect(useProjectStore.getState().rooms[0].pts[0].x).toBe(moved - 15)  // všechny tři posuny najednou
    expect(useProjectStore.getState().rooms).toHaveLength(1)               // přidání místnosti zůstalo
  })

  it('nová úprava po undo zahodí redo', () => {
    const s = useProjectStore.getState()
    s.addRoom('rect')
    undo()
    expect(useHistoryStatus.getState().canRedo).toBe(true)
    s.addRoom('L-left')
    expect(useHistoryStatus.getState().canRedo).toBe(false)
  })
})
