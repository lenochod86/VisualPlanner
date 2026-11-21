import type { PointerEvent } from 'react'
import type { Placed, Room } from '../../domain/types'
import { resolvePlacement } from '../../geometry/placement'
import { edgeInfo } from '../../geometry/polygon'
import type { WallModel } from '../../geometry/walls'

interface Props {
  item: Placed
  room: Room
  walls: WallModel
  inWall: boolean
  k: number
  onPointerDown: (e: PointerEvent, end: 'start' | 'end') => void
}

/** Úchyty na obou koncích vybrané věci na zdi (okno, dveře, gauč…): tažením se mění její šířka podél zdi. */
export function ItemHandles({ item, room, walls, inWall, k, onPointerDown }: Props) {
  if (!item.attach || item.attach.edge >= room.pts.length) return null  // volně stojící věc nemá zeď, podél které by se táhla
  const p = resolvePlacement(item, room, walls, inWall)
  const dir = edgeInfo(room.pts, item.attach.edge).dir
  const cursor = Math.abs(dir.x) > 0.5 ? 'ew-resize' : 'ns-resize'

  return (
    <>
      {(['start', 'end'] as const).map(end => {
        const sign = end === 'start' ? -1 : 1
        return (
          <circle
            key={end}
            cx={p.x + dir.x * sign * item.w / 2} cy={p.y + dir.y * sign * item.w / 2}
            r={6 * k} fill="#fff" stroke="#2f6fed" strokeWidth={2 * k}
            style={{ cursor }}
            onPointerDown={e => onPointerDown(e, end)}
          />
        )
      })}
    </>
  )
}
