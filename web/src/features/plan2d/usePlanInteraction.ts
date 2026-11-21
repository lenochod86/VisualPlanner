// Všechna tažení v 2D plánu: posun plátna, tažení stěny, přesun místnosti, přesun věcí
// (překážky a nábytek), tažení za konec věci a kreslení nové místnosti.
import { useState, type PointerEvent, type RefObject } from 'react'
import { MIN_DRAWN_ROOM } from '../../config'
import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Placed, Pt, Rect } from '../../domain/types'
import { magnetEdgeCoord, magnetRoomShift } from '../../geometry/magnet'
import { snap } from '../../geometry/math'
import { dragFurniturePatch, dragObstaclePatch, resizeAlongWall } from '../../geometry/placement'
import { edgeInfo, moveEdge, translatePts } from '../../geometry/polygon'
import { rectFromCorners } from '../../geometry/shapes'
import { buildWallModel } from '../../geometry/walls'
import { beginGesture, endGesture } from '../../store/history'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import type { Viewport } from './useViewport'

/** Odkaz na věc v jednom ze dvou seznamů projektu. */
type ItemRef = { collection: 'obstacles' | 'furniture'; id: string }

type Drag =
  | { kind: 'pan'; lastClient: Pt }
  | { kind: 'edge'; roomId: string; edge: number }
  | { kind: 'room'; roomId: string; last: Pt }
  | { kind: 'item'; ref: ItemRef }
  | { kind: 'itemEnd'; ref: ItemRef; end: 'start' | 'end' }
  | { kind: 'draw'; from: Pt; to: Pt }

const snapPt = (p: Pt): Pt => ({ x: snap(p.x), y: snap(p.y) })

function findItem(ref: ItemRef): Placed | undefined {
  const s = useProjectStore.getState()
  return (ref.collection === 'obstacles' ? s.obstacles : s.furniture).find(i => i.id === ref.id)
}

function patchItem(ref: ItemRef, patch: Partial<Placed>) {
  const s = useProjectStore.getState()
  if (ref.collection === 'obstacles') s.updateObstacle(ref.id, patch)
  else s.updateFurniture(ref.id, patch)
}

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

  const beginItemDrag = (e: PointerEvent, ref: ItemRef) => {
    useUiStore.getState().select({ type: ref.collection === 'obstacles' ? 'obstacle' : 'furniture', id: ref.id })
    begin(e, { kind: 'item', ref })
  }

  const beginItemResize = (e: PointerEvent, ref: ItemRef, end: 'start' | 'end') => {
    begin(e, { kind: 'itemEnd', ref, end })
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

  function dragItem(ref: ItemRef, p: Pt) {
    const { rooms } = useProjectStore.getState()
    const item = findItem(ref)
    if (!item) return
    if (ref.collection === 'furniture') {
      patchItem(ref, dragFurniturePatch(item, rooms, buildWallModel(rooms), p))
      return
    }
    const room = rooms.find(r => r.id === item.roomId)
    const obstacle = useProjectStore.getState().obstacles.find(o => o.id === ref.id)
    const inWall = !!obstacle && OBSTACLE_KINDS[obstacle.kind].inWall
    if (room) patchItem(ref, dragObstaclePatch(room, p, inWall))
  }

  function dragItemEnd(d: Extract<Drag, { kind: 'itemEnd' }>, p: Pt) {
    const item = findItem(d.ref)
    const room = item && useProjectStore.getState().rooms.find(r => r.id === item.roomId)
    if (!item?.attach || !room) return
    const e = edgeInfo(room.pts, item.attach.edge)
    const t = (p.x - e.a.x) * e.dir.x + (p.y - e.a.y) * e.dir.y  // poloha kurzoru podél zdi
    patchItem(d.ref, resizeAlongWall({ ...item, attach: item.attach }, e.len, d.end, t))
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
    else if (drag.kind === 'item') dragItem(drag.ref, p)
    else if (drag.kind === 'itemEnd') dragItemEnd(drag, p)
    else setDrag({ ...drag, to: snapPt(p) })
  }

  const onPointerUp = () => {
    if (drag?.kind === 'draw') finishDrawing(rectFromCorners(drag.from, drag.to))
    endGesture()
    setDrag(null)
  }

  const drawRect: Rect | null = drag?.kind === 'draw' ? rectFromCorners(drag.from, drag.to) : null

  return {
    drawRect, beginRoomDrag, beginEdgeDrag, beginItemDrag, beginItemResize,
    onBackgroundPointerDown, onPointerMove, onPointerUp,
  }
}

function finishDrawing(rect: Rect) {
  if (rect.w < MIN_DRAWN_ROOM || rect.h < MIN_DRAWN_ROOM) return // jen klik / příliš malé: kreslení pokračuje
  const id = useProjectStore.getState().addRoomFromRect(rect)
  const ui = useUiStore.getState()
  ui.select({ type: 'room', id })
  ui.setTool('select')
}
