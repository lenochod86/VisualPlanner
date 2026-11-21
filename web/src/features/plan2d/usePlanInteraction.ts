// Všechna tažení v 2D plánu: posun plátna, tažení stěny, přesun místnosti, přesun věcí
// (překážky a nábytek), tažení za konec věci a kreslení nové místnosti.
import { useState, type PointerEvent, type RefObject } from 'react'
import { MIN_DRAWN_ROOM } from '../../config'
import type { Pt, Rect, Waypoint } from '../../domain/types'
import { magnetEdgeCoord, magnetRoomShift } from '../../geometry/magnet'
import { snap } from '../../geometry/math'
import { resizeAlongWall } from '../../geometry/placement'
import { edgeInfo, moveEdge, translatePts } from '../../geometry/polygon'
import { rectFromCorners } from '../../geometry/shapes'
import { dragTargetTo, findItem, patchItem, type ItemRef } from '../interaction/dragTargets'
import { beginGesture, endGesture } from '../../store/history'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import type { Viewport } from './useViewport'

type Drag =
  | { kind: 'pan'; lastClient: Pt }
  | { kind: 'edge'; roomId: string; edge: number }
  | { kind: 'room'; roomId: string; last: Pt }
  | { kind: 'item'; ref: ItemRef }
  | { kind: 'itemEnd'; ref: ItemRef; end: 'start' | 'end' }
  | { kind: 'point'; id: string }
  | { kind: 'waypoint'; cableId: string; index: number }
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
    const ui = useUiStore.getState()
    ui.select({ type: 'room', id: roomId })
    // mimo záložku Půdorys se místnosti nepřesouvají: klik jen vybere (např. jako cíl pro nový nábytek), tažení posouvá plátno
    if (ui.mode !== 'plan') begin(e, { kind: 'pan', lastClient: { x: e.clientX, y: e.clientY } })
    else begin(e, { kind: 'room', roomId, last: viewport.toWorld(e) })
  }

  const beginEdgeDrag = (e: PointerEvent, roomId: string, edge: number) => {
    if (useUiStore.getState().mode !== 'plan') return          // rozměry se mění jen v záložce Půdorys
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

  // ---- elektro ----

  /** V režimu kabelu: první klik vybere začátek, druhý konec a vytvoří se kabel s automatickou trasou. Jinak tažení bodu. */
  const beginPointDrag = (e: PointerEvent, id: string) => {
    const ui = useUiStore.getState()
    if (ui.tool === 'cable') {
      e.stopPropagation()
      if (!ui.cableStart) { ui.setCableStart(id); return }
      if (ui.cableStart === id) return
      beginGesture() // vytvoření + trasování = jeden krok v undo
      const cableId = useProjectStore.getState().addCable(ui.cableStart, id, ui.cableType)
      endGesture()
      ui.setCableStart(null)
      ui.setTool('select')
      if (cableId) ui.select({ type: 'cable', id: cableId })
      return
    }
    ui.select({ type: 'electric', id })
    begin(e, { kind: 'point', id })
  }

  const selectCable = (e: PointerEvent, id: string) => {
    e.stopPropagation()
    useUiStore.getState().select({ type: 'cable', id })
  }

  const beginWaypointDrag = (e: PointerEvent, cableId: string, index: number) =>
    begin(e, { kind: 'waypoint', cableId, index })

  /** Tažení za "+" vloží bod do trasy a hned ho táhne. */
  const beginWaypointInsert = (e: PointerEvent, cableId: string, index: number, at: Waypoint) => {
    begin(e, { kind: 'waypoint', cableId, index })
    useProjectStore.getState().insertWaypoint(cableId, index, at)
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
    else if (drag.kind === 'item') dragTargetTo(drag.ref, p)
    else if (drag.kind === 'itemEnd') dragItemEnd(drag, p)
    else if (drag.kind === 'point') dragTargetTo({ collection: 'electric', id: drag.id }, p)
    else if (drag.kind === 'waypoint') useProjectStore.getState().updateWaypoint(drag.cableId, drag.index, { x: snap(p.x), y: snap(p.y) })
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
    beginPointDrag, selectCable, beginWaypointDrag, beginWaypointInsert,
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
