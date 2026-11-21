import { useEffect, useRef, useState } from 'react'
import { bbox } from '../../geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { useWallModel } from '../../store/useWallModel'
import { useUiStore } from '../../store/uiStore'
import { EdgeLengthEditor } from './EdgeLengthEditor'
import { GridBackground } from './GridBackground'
import { ObstacleView } from './ObstacleView'
import { RoomView } from './RoomView'
import { usePlanInteraction } from './usePlanInteraction'
import { useViewport } from './useViewport'

/** Půdorys (SVG): složí dohromady viewport, interakce a vykreslení místností a překážek. */
export function Plan2D() {
  const rooms = useProjectStore(s => s.rooms)
  const obstacles = useProjectStore(s => s.obstacles)
  const selection = useUiStore(s => s.selection)
  const tool = useUiStore(s => s.tool)
  const fitRequest = useUiStore(s => s.fitRequest)
  const hoveredWall = useUiStore(s => s.hoveredWall)
  const walls = useWallModel()

  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const viewport = useViewport(wrapRef, svgRef)
  const interaction = usePlanInteraction(svgRef, viewport)
  const [editing, setEditing] = useState<{ roomId: string; edge: number } | null>(null)

  // "Přizpůsobit pohled" (tlačítko v postranním panelu / po načtení projektu)
  useEffect(() => {
    if (fitRequest === 0 || rooms.length === 0) return
    viewport.fitTo(bbox(rooms.flatMap(r => r.pts)))
  }, [fitRequest])

  const editedRoom = editing && rooms.find(r => r.id === editing.roomId)

  return (
    <div ref={wrapRef} className={`plan ${tool === 'draw' ? 'drawing' : ''}`} onWheel={viewport.onWheel}>
      <svg
        ref={svgRef}
        width={viewport.size.w} height={viewport.size.h}
        viewBox={`${viewport.box.x} ${viewport.box.y} ${viewport.box.w} ${viewport.box.h}`}
        onPointerDown={e => { setEditing(null); interaction.onBackgroundPointerDown(e) }}
        onPointerMove={interaction.onPointerMove}
        onPointerUp={interaction.onPointerUp}
        onPointerCancel={interaction.onPointerUp}
      >
        <GridBackground viewport={viewport} />

        {rooms.map(room => (
          <RoomView
            key={room.id} room={room} thicknesses={walls.thicknesses(room)} k={viewport.k}
            highlightedEdge={hoveredWall?.roomId === room.id ? hoveredWall.edge : null}
            selected={selection?.type === 'room' && selection.id === room.id}
            onBodyPointerDown={e => interaction.beginRoomDrag(e, room.id)}
            onEdgePointerDown={(e, edge) => interaction.beginEdgeDrag(e, room.id, edge)}
            onEditDimension={edge => setEditing({ roomId: room.id, edge })}
          />
        ))}

        {obstacles.map(obstacle => {
          const room = rooms.find(r => r.id === obstacle.roomId)
          if (!room) return null
          return (
            <ObstacleView
              key={obstacle.id} obstacle={obstacle} room={room} walls={walls} k={viewport.k}
              selected={selection?.type === 'obstacle' && selection.id === obstacle.id}
              onPointerDown={e => interaction.beginObstacleDrag(e, obstacle.id)}
            />
          )
        })}

        {interaction.drawRect && (
          <rect {...interaction.drawRect} fill="#2f6fed22" stroke="#2f6fed" strokeWidth={2 * viewport.k}
            strokeDasharray={`${6 * viewport.k}`} pointerEvents="none" />
        )}
      </svg>

      {editing && editedRoom && (
        <EdgeLengthEditor room={editedRoom} edge={editing.edge} viewport={viewport} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
