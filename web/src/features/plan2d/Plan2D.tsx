import { useEffect, useRef, useState } from 'react'
import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { Placed } from '../../domain/types'
import { cablePolyline } from '../../geometry/electric'
import { bbox } from '../../geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { useFurnitureIssues } from '../../store/useFurnitureIssues'
import { useWallModel } from '../../store/useWallModel'
import { useUiStore } from '../../store/uiStore'
import { CableView } from './CableView'
import { EdgeLengthEditor } from './EdgeLengthEditor'
import { ElectricView } from './ElectricView'
import { FurnitureView } from './FurnitureView'
import { GridBackground } from './GridBackground'
import { ItemHandles } from './ItemHandles'
import { ObstacleView } from './ObstacleView'
import { RoomView } from './RoomView'
import { usePlanInteraction } from './usePlanInteraction'
import { useViewport } from './useViewport'

/** Půdorys (SVG): složí dohromady viewport, interakce a vykreslení místností, nábytku a překážek. */
export function Plan2D() {
  const rooms = useProjectStore(s => s.rooms)
  const obstacles = useProjectStore(s => s.obstacles)
  const furniture = useProjectStore(s => s.furniture)
  const electric = useProjectStore(s => s.electric)
  const cables = useProjectStore(s => s.cables)
  const selection = useUiStore(s => s.selection)
  const tool = useUiStore(s => s.tool)
  const fitRequest = useUiStore(s => s.fitRequest)
  const hoveredWall = useUiStore(s => s.hoveredWall)
  const cableStart = useUiStore(s => s.cableStart)
  const walls = useWallModel()
  const issues = useFurnitureIssues()

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

  // Vybraná věc na zdi dostane úchyty pro změnu šířky.
  const selectedObstacle = selection?.type === 'obstacle' ? obstacles.find(o => o.id === selection.id) : undefined
  const selectedFurniture = selection?.type === 'furniture' ? furniture.find(f => f.id === selection.id) : undefined
  const handleItem: (Placed & { inWall: boolean; collection: 'obstacles' | 'furniture' }) | undefined =
    selectedObstacle ? { ...selectedObstacle, inWall: OBSTACLE_KINDS[selectedObstacle.kind].inWall, collection: 'obstacles' }
    : selectedFurniture ? { ...selectedFurniture, inWall: false, collection: 'furniture' }
    : undefined
  const handleRoom = handleItem && rooms.find(r => r.id === handleItem.roomId)

  const editedRoom = editing && rooms.find(r => r.id === editing.roomId)

  return (
    <div ref={wrapRef} className={`plan ${tool !== 'select' ? 'drawing' : ''}`} onWheel={viewport.onWheel}>
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

        {furniture.map(item => {
          const room = rooms.find(r => r.id === item.roomId)
          if (!room) return null
          return (
            <FurnitureView
              key={item.id} furniture={item} room={room} walls={walls} k={viewport.k}
              selected={selection?.type === 'furniture' && selection.id === item.id}
              issue={issues.some(i => i.furnitureId === item.id)}
              onPointerDown={e => interaction.beginItemDrag(e, { collection: 'furniture', id: item.id })}
            />
          )
        })}

        {obstacles.map(obstacle => {
          const room = rooms.find(r => r.id === obstacle.roomId)
          if (!room) return null
          return (
            <ObstacleView
              key={obstacle.id} obstacle={obstacle} room={room} walls={walls} k={viewport.k}
              selected={selection?.type === 'obstacle' && selection.id === obstacle.id}
              onPointerDown={e => interaction.beginItemDrag(e, { collection: 'obstacles', id: obstacle.id })}
            />
          )
        })}

        {cables.map(cable => {
          const polyline = cablePolyline(cable, electric, rooms)
          if (!polyline) return null
          return (
            <CableView
              key={cable.id} cable={cable} polyline={polyline} k={viewport.k}
              selected={selection?.type === 'cable' && selection.id === cable.id}
              onSelect={e => interaction.selectCable(e, cable.id)}
              onWaypointPointerDown={(e, index) => interaction.beginWaypointDrag(e, cable.id, index)}
              onInsertPointerDown={(e, index, at) => interaction.beginWaypointInsert(e, cable.id, index, at)}
            />
          )
        })}

        {electric.map(point => {
          const room = rooms.find(r => r.id === point.roomId)
          if (!room) return null
          return (
            <ElectricView
              key={point.id} point={point} room={room} k={viewport.k}
              selected={selection?.type === 'electric' && selection.id === point.id}
              pending={cableStart === point.id}
              onPointerDown={e => interaction.beginPointDrag(e, point.id)}
            />
          )
        })}

        {handleItem && handleRoom && (
          <ItemHandles
            item={handleItem} room={handleRoom} walls={walls} inWall={handleItem.inWall} k={viewport.k}
            onPointerDown={(e, end) => interaction.beginItemResize(e, { collection: handleItem.collection, id: handleItem.id }, end)}
          />
        )}

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
