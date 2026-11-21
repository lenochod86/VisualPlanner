import { useRef } from 'react'
import type { Room } from '../../domain/types'
import { edgeInfo } from '../../geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import type { Viewport } from './useViewport'

interface Props {
  room: Room
  edge: number
  viewport: Viewport
  onClose: () => void
}

/** Políčko pro ruční zadání délky stěny, umístěné přesně na číslo u stěny. */
export function EdgeLengthEditor({ room, edge, viewport, onClose }: Props) {
  const setWallLength = useProjectStore(s => s.setWallLength)
  const finished = useRef(false)  // Enter i následný blur nesmí potvrdit dvakrát; Esc nesmí uložit nic

  const e = edgeInfo(room.pts, edge)
  const offset = 14 * viewport.k
  const pos = viewport.toScreen({
    x: (e.a.x + e.b.x) / 2 + e.inward.x * offset,
    y: (e.a.y + e.b.y) / 2 + e.inward.y * offset,
  })

  const finish = (value: string | null) => {
    if (finished.current) return
    finished.current = true
    if (value !== null) setWallLength(room.id, edge, parseFloat(value.replace(',', '.')))
    onClose()
  }

  return (
    <input
      className="dim-input" autoFocus defaultValue={Math.round(e.len)}
      style={{ left: pos.left, top: pos.top }}
      onFocus={ev => ev.target.select()}
      onKeyDown={ev => {
        if (ev.key === 'Enter') finish(ev.currentTarget.value)
        if (ev.key === 'Escape') finish(null)
      }}
      onBlur={ev => finish(ev.target.value)}
    />
  )
}
