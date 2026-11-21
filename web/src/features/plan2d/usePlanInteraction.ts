// Všechna tažení v 2D plánu: posun plátna, tažení stěny, přesun místnosti, přesun překážky a kreslení nové místnosti.
import { useState, type PointerEvent, type RefObject } from 'react'
import { MIN_DRAWN_ROOM, OBSTACLE_WALL_SNAP } from '../../config'
import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Pt, Rect } from '../../domain/types'
import { magnetEdgeCoord, magnetRoomShift } from '../../geometry/magnet'
import { snap } from '../../geometry/math'
import { nearestEdge } from '../../geometry/obstacles'
import { edgeInfo, moveEdge, translatePts } from '../../geometry/polygon'
import { rectFromCorners } from '../../geometry/shapes'
import { beginGesture, endGesture } from '../../store/history'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import type { Viewport } from './useViewport'

type Drag =
  | { kind: 'pan'; lastClient: Pt }
  | { kind: 'edge'; roomId: string; edge: number }
  | { kind: 'room'; roomId: string; last: Pt }
  | { kind: 'obstacle'; id: string }
  | { kind: 'draw'; from: Pt; to: Pt }

const snapPt = (p: Pt): Pt => ({ x: snap(p.x), y: snap(p.y) })

export function usePlanInteraction(svgRef: RefObject<SVGSVGElement | null>, viewport: Viewport) {
  const [drag, setDrag] = useState<Drag | null>(null)

  function begin(e: PointerEvent, next: Drag) {
    e.stopPropagation()
    svgRef.current?.setPointerCapture(e.pointerId)
    beginGesture() // celé tažení = jeden krok v undo
    setDrag(next)
  }

  // ---- zahájení tažení (volají komponenty při pointerdown) ----

  const beginRoomDrag = (e: PointerEvent, roomId: string) => {
    useUiStore.getState().select({ type: 'room', id: roomId })
    begin(e, { kind: 'room', roomId, last: viewport.toWorld(e) })
  }

  const beginEdgeDrag = (e: PointerEvent, roomId: string, edge: number) => {
    useUiStore.getState().select({ type: 'room', id: roomId })
    begin(e, { kind: 'edge', roomId, edge })
  }

  const beginObstacleDrag = (e: PointerEvent, id: string) => {
    useUiStore.getState().select({ type: 'obstacle', id })
    begin(e, { kind: 'obstacle', id })
  }

  const onBackgroundPointerDown = (e: PointerEvent) => {
    const ui = useUiStore.getState()
    if (ui.tool === 'draw') {
      const p = snapPt(viewport.toWorld(e))
      begin(e, { kind: 'draw', from: p, to: p })
    } else {
      ui.select(null)
      begin(e, { kind: 'pan', lastClient: { x: e.clientX, y: e.clientY } })
    }
  }

  // ---- průběh tažení ----

  function dragEdge(d: Extract<Drag, { kind: 'edge' }>, p: Pt) {
    const { rooms, updateRoom } = useProjectStore.getState()
    const room = rooms.find(r => r.id === d.roomId)
    if (!room) return
    const others = rooms.filter(r => r.id !== room.id).map(r => r.pts)
    const raw = snap(edgeInfo(room.pts, d.edge).horizontal ? p.y : p.x)
    const coord = magnetEdgeCoord(room.pts, d.edge, raw, others, room.walls[d.edge])
    updateRoom(room.id, { pts: moveEdge(room.pts, d.edge, coord) })
  }

  function dragRoom(d: Extract<Drag, { kind: 'room' }>, p: Pt) {
    const { rooms, moveRoom } = useProjectStore.getState()
    const room = rooms.find(r => r.id === d.roomId)
    if (!room) return
    const dx = snap(p.x - d.last.x), dy = snap(p.y - d.last.y)
    if (!dx && !dy) return
    // magnet: po přesunu se místnost ještě dotáhne k sousedům (sdílená zeď)
    const others = rooms.filter(r => r.id !== room.id).map(r => r.pts)
    const pull = magnetRoomShift(translatePts(room.pts, dx, dy), others, room.walls)
    moveRoom(room.id, dx + pull.x, dy + pull.y)
    setDrag({ ...d, last: { x: d.last.x + dx, y: d.last.y + dy } })
  }

  function dragObstacle(d: Extract<Drag, { kind: 'obstacle' }>, p: Pt) {
    const { obstacles, rooms, updateObstacle } = useProjectStore.getState()
    const obstacle = obstacles.find(o => o.id === d.id)
    const room = obstacle && rooms.find(r => r.id === obstacle.roomId)
    if (!obstacle || !room) return
    const near = nearestEdge(room.pts, p)
    if (OBSTACLE_KINDS[obstacle.kind].inWall || near.dist < OBSTACLE_WALL_SNAP) {
      updateObstacle(obstacle.id, { attach: { edge: near.edge, along: snap(near.along) } })
    } else {
      updateObstacle(obstacle.id, { attach: undefined, x: snap(p.x), y: snap(p.y) })
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!drag) return
    if (drag.kind === 'pan') {
      viewport.panByPixels(e.clientX - drag.lastClient.x, e.clientY - drag.lastClient.y)
      setDrag({ kind: 'pan', lastClient: { x: e.clientX, y: e.clientY } })
      return
    }
    const p = viewport.toWorld(e)
    if (drag.kind === 'edge') dragEdge(drag, p)
    else if (drag.kind === 'room') dragRoom(drag, p)
    else if (drag.kind === 'obstacle') dragObstacle(drag, p)
    else setDrag({ ...drag, to: snapPt(p) })
  }

  const onPointerUp = () => {
    if (drag?.kind === 'draw') finishDrawing(rectFromCorners(drag.from, drag.to))
    endGesture()
    setDrag(null)
  }

  const drawRect: Rect | null = drag?.kind === 'draw' ? rectFromCorners(drag.from, drag.to) : null

  return { drawRect, beginRoomDrag, beginEdgeDrag, beginObstacleDrag, onBackgroundPointerDown, onPointerMove, onPointerUp }
}

function finishDrawing(rect: Rect) {
  if (rect.w < MIN_DRAWN_ROOM || rect.h < MIN_DRAWN_ROOM) return // jen klik / příliš malé: kreslení pokračuje
  const id = useProjectStore.getState().addRoomFromRect(rect)
  const ui = useUiStore.getState()
  ui.select({ type: 'room', id })
  ui.setTool('select')
}
