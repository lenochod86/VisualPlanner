import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { OBS_KINDS, ROOM_TYPES, SNAP } from './constants'
import { bbox, edgeInfo, moveEdge, nearestEdge, resolveObs, setEdgeLength, snap } from './geometry'
import type { Pt } from './types'

type Drag =
  | { kind: 'pan'; last: Pt }
  | { kind: 'edge'; room: string; edge: number }
  | { kind: 'room'; room: string; last: Pt }
  | { kind: 'obs'; id: string }

export function Plan2D() {
  const { rooms, obstacles, selection, select, updateRoom, moveRoom, updateObstacle } = useStore()
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState({ cx: 225, cy: 175, scale: 1.2 }) // scale = px / cm
  const [drag, setDrag] = useState<Drag | null>(null)
  const [editing, setEditing] = useState<{ room: string; edge: number } | null>(null)

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(wrap.current!)
    return () => ro.disconnect()
  }, [])

  const k = 1 / view.scale // cm na pixel
  const vb = { x: view.cx - size.w * k / 2, y: view.cy - size.h * k / 2, w: size.w * k, h: size.h * k }

  const world = (e: { clientX: number; clientY: number }): Pt => {
    const m = svg.current!.getScreenCTM()!.inverse()
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m)
    return { x: p.x, y: p.y }
  }
  const toScreen = (p: Pt) => ({ left: (p.x - vb.x) * view.scale, top: (p.y - vb.y) * view.scale })

  const onWheel = (e: React.WheelEvent) => {
    const before = world(e)
    const scale = Math.min(6, Math.max(0.15, view.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
    const nk = 1 / scale
    const r = svg.current!.getBoundingClientRect()
    // zoom kolem kurzoru: bod pod kurzorem zůstane na místě
    setView({
      scale,
      cx: before.x - ((e.clientX - r.left) - size.w / 2) * nk,
      cy: before.y - ((e.clientY - r.top) - size.h / 2) * nk,
    })
  }

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    const p = world(e)
    if (drag.kind === 'pan') {
      const dx = (e.clientX - drag.last.x) * k, dy = (e.clientY - drag.last.y) * k
      setView(v => ({ ...v, cx: v.cx - dx, cy: v.cy - dy }))
      setDrag({ kind: 'pan', last: { x: e.clientX, y: e.clientY } })
    } else if (drag.kind === 'edge') {
      const room = rooms.find(r => r.id === drag.room)!
      const horiz = edgeInfo(room.pts, drag.edge).horizontal
      updateRoom(room.id, { pts: moveEdge(room.pts, drag.edge, snap(horiz ? p.y : p.x, SNAP)) })
    } else if (drag.kind === 'room') {
      const dx = snap(p.x - drag.last.x, SNAP), dy = snap(p.y - drag.last.y, SNAP)
      if (dx || dy) {
        moveRoom(drag.room, dx, dy)
        setDrag({ ...drag, last: { x: drag.last.x + dx, y: drag.last.y + dy } })
      }
    } else if (drag.kind === 'obs') {
      const o = obstacles.find(x => x.id === drag.id)!
      const room = rooms.find(r => r.id === o.roomId)!
      const n = nearestEdge(room.pts, p)
      const mustWall = OBS_KINDS[o.kind].wall
      if (mustWall || n.dist < 30) updateObstacle(o.id, { attach: { edge: n.edge, along: snap(n.along, SNAP) } })
      else updateObstacle(o.id, { attach: undefined, x: snap(p.x, SNAP), y: snap(p.y, SNAP) })
    }
  }

  const start = (d: Drag) => (e: React.PointerEvent) => {
    e.stopPropagation()
    svg.current!.setPointerCapture(e.pointerId)
    setDrag(d)
  }

  const editedRoom = editing && rooms.find(r => r.id === editing.room)

  return (
    <div ref={wrap} className="plan" onWheel={onWheel}>
      <svg
        ref={svg}
        width={size.w} height={size.h}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        onPointerMove={onMove}
        onPointerUp={() => setDrag(null)}
        onPointerDown={e => {
          select(null); setEditing(null)
          svg.current!.setPointerCapture(e.pointerId)
          setDrag({ kind: 'pan', last: { x: e.clientX, y: e.clientY } })
        }}
      >
        <defs>
          <pattern id="g10" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="#e3e6ea" strokeWidth={k} />
          </pattern>
          <pattern id="g100" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill={view.scale > 0.6 ? 'url(#g10)' : 'none'} />
            <path d="M100 0H0V100" fill="none" stroke="#c9ced6" strokeWidth={k} />
          </pattern>
        </defs>
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#fafbfc" />
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#g100)" />

        {rooms.map(room => {
          const sel = selection?.type === 'room' && selection.id === room.id
          const pts = room.pts.map(p => `${p.x},${p.y}`).join(' ')
          const b = bbox(room.pts)
          return (
            <g key={room.id}>
              <polygon
                points={pts} fill={ROOM_TYPES[room.type].color}
                stroke="#33383f" strokeWidth={room.wallT} strokeLinejoin="miter" paintOrder="stroke"
                style={{ cursor: 'move' }}
                onPointerDown={e => { select({ type: 'room', id: room.id }); start({ kind: 'room', room: room.id, last: world(e) })(e) }}
              />
              <polygon points={pts} fill="none" stroke={sel ? '#2f6fed' : 'transparent'} strokeWidth={2 * k} pointerEvents="none" />
              <text x={(b.minX + b.maxX) / 2} y={(b.minY + b.maxY) / 2} textAnchor="middle" fontSize={16 * k}
                fill="#444" pointerEvents="none">{room.name}</text>

              {room.pts.map((_, i) => {
                const e = edgeInfo(room.pts, i)
                const mx = (e.a.x + e.b.x) / 2, my = (e.a.y + e.b.y) / 2
                const lx = mx + e.outward.x * (room.wallT + 16 * k), ly = my + e.outward.y * (room.wallT + 16 * k)
                return (
                  <g key={i}>
                    <line x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke="transparent" strokeWidth={14 * k}
                      style={{ cursor: e.horizontal ? 'ns-resize' : 'ew-resize' }}
                      onPointerDown={ev => { select({ type: 'room', id: room.id }); start({ kind: 'edge', room: room.id, edge: i })(ev) }} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={12 * k}
                      fill="#2f6fed" style={{ cursor: 'text' }}
                      onPointerDown={ev => { ev.stopPropagation(); setEditing({ room: room.id, edge: i }) }}>
                      {Math.round(e.len)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}

        {obstacles.map(o => {
          const room = rooms.find(r => r.id === o.roomId)
          if (!room) return null
          const p = resolveObs(o, room)
          const sel = selection?.type === 'obs' && selection.id === o.id
          return (
            <rect key={o.id} x={-o.w / 2} y={-o.d / 2} width={o.w} height={o.d}
              transform={`translate(${p.x} ${p.y}) rotate(${p.rot * 180 / Math.PI})`}
              fill={OBS_KINDS[o.kind].color} stroke={sel ? '#2f6fed' : '#222'} strokeWidth={(sel ? 2 : 1) * k}
              style={{ cursor: 'grab' }}
              onPointerDown={e => { select({ type: 'obs', id: o.id }); start({ kind: 'obs', id: o.id })(e) }} />
          )
        })}
      </svg>

      {editing && editedRoom && (() => {
        const e = edgeInfo(editedRoom.pts, editing.edge)
        const off = editedRoom.wallT + 16 * k
        const pos = toScreen({ x: (e.a.x + e.b.x) / 2 + e.outward.x * off, y: (e.a.y + e.b.y) / 2 + e.outward.y * off })
        const commit = (v: string) => {
          const L = parseFloat(v)
          if (L > 0) updateRoom(editedRoom.id, { pts: setEdgeLength(editedRoom.pts, editing.edge, L) })
          setEditing(null)
        }
        return (
          <input className="dim-input" autoFocus defaultValue={Math.round(e.len)}
            style={{ left: pos.left, top: pos.top }}
            onFocus={ev => ev.target.select()}
            onKeyDown={ev => { if (ev.key === 'Enter') commit(ev.currentTarget.value); if (ev.key === 'Escape') setEditing(null) }}
            onBlur={ev => commit(ev.target.value)} />
        )
      })()}
    </div>
  )
}
