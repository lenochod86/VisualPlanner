import { useEffect, useMemo, useRef, useState } from 'react'
import { OBSTACLE_KINDS } from '../../domain/catalog'
import { systemOfLine, systemOfPoint, type System } from '../../domain/electricCatalog'
import { isDecor } from '../../domain/furnitureCatalog'
import type { Placed } from '../../domain/types'
import { electricDistances } from '../../geometry/distances'
import { cablePolyline } from '../../geometry/electric'
import { bbox } from '../../geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { useFurnitureIssues } from '../../store/useFurnitureIssues'
import { useWallModel } from '../../store/useWallModel'
import { canEditInMode, useUiStore } from '../../store/uiStore'
import { CableView } from './CableView'
import { EdgeLengthEditor } from './EdgeLengthEditor'
import { DistanceDims } from './DistanceDims'
import { ElectricView } from "./ElectricView"
import { FurnitureView } from './FurnitureView'
import { GridBackground } from './GridBackground'
import { ItemHandles } from './ItemHandles'
import { ObstacleView } from "./ObstacleView"
import { RoomLabels } from './RoomLabels'
import { RoomView } from './RoomView'
import { usePlanInteraction } from './usePlanInteraction'
import { useViewport } from './useViewport'

/** Vrstva půdorysu: průsvitnost a to, zda reaguje na myš. */
const LAYER_ACTIVE = { opacity: 1, interactive: true }
const LAYER_DIMMED = { opacity: 0.3, interactive: false }
const LAYER_FAINT = { opacity: 0.16, interactive: false }
const layerProps = (l: { opacity: number; interactive: boolean }) => ({
  opacity: l.opacity,
  pointerEvents: l.interactive ? undefined : ('none' as const),
})

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
  const mode = useUiStore(s => s.mode)
  const cableStart = useUiStore(s => s.cableStart)
  const walls = useWallModel()
  const issues = useFurnitureIssues()

  // Každá záložka upravuje svou vrstvu: ostatní jsou průsvitné a nereagují na myš, aby nepřekážely.
  // Půdorys = místnosti (nábytek i elektro jen slabě prosvítá), Vybavení = nábytek, Elektro = elektro (nábytek prosvítá).
  const furnitureLayer = mode === 'equipment' ? LAYER_ACTIVE : mode === 'electro' || mode === 'plumbing' || mode === 'decor' ? LAYER_DIMMED : LAYER_FAINT
  // dekorace (police, květiny) mají vlastní vrstvu: aktivní jen v záložce Dekorace
  const decorLayer = mode === 'decor' ? LAYER_ACTIVE : mode === 'plan' ? LAYER_FAINT : LAYER_DIMMED
  const electroLayer = mode === 'electro' ? LAYER_ACTIVE : mode === 'equipment' ? LAYER_DIMMED : LAYER_FAINT
  // vodoinstalace má vlastní vrstvu: aktivní jen v záložce Vodoinstalace, jinde slabě prosvítá
  const plumbingLayer = mode === 'plumbing' ? LAYER_ACTIVE : mode === 'equipment' ? LAYER_DIMMED : LAYER_FAINT
  const layerOf = (system: System) => (system === 'electro' ? electroLayer : plumbingLayer)
  const editableRooms = mode === 'plan'
  const activeSystem: System = mode === 'plumbing' ? 'plumbing' : 'electro'
  const inactiveSystem: System = mode === 'plumbing' ? 'electro' : 'plumbing'

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
  const selectedObstacle = selection?.type === 'obstacle' && canEditInMode('obstacle', mode) ? obstacles.find(o => o.id === selection.id) : undefined
  const selectedFurnitureAny = selection?.type === 'furniture' ? furniture.find(f => f.id === selection.id) : undefined
  const selectedFurniture = selectedFurnitureAny && canEditInMode('furniture', mode, { furniture: selectedFurnitureAny.kind }) ? selectedFurnitureAny : undefined
  const handleItem: (Placed & { inWall: boolean; collection: 'obstacles' | 'furniture' }) | undefined =
    selectedObstacle ? { ...selectedObstacle, inWall: OBSTACLE_KINDS[selectedObstacle.kind].inWall, collection: 'obstacles' }
    : selectedFurniture ? { ...selectedFurniture, inWall: false, collection: 'furniture' }
    : undefined
  const handleRoom = handleItem && rooms.find(r => r.id === handleItem.roomId)

  const selectedPoint = selection?.type === 'electric' ? electric.find(p => p.id === selection.id) : undefined
  const distanceLines = useMemo(
    () => (mode === 'electro' && selectedPoint ? electricDistances(selectedPoint, { rooms, obstacles, furniture, electric }) : []),
    [mode, selectedPoint, rooms, obstacles, furniture, electric],
  )

  const editedRoom = editing && rooms.find(r => r.id === editing.roomId)

  // Vrstvy věcí v půdorysu. Pořadí kreslení určuje záložka (viz níže).
  const renderFurniture = (items: typeof furniture) => items.map(item => {
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
  })
  const furnitureJsx = (
    <>
      <g {...layerProps(furnitureLayer)}>{renderFurniture(furniture.filter(f => !isDecor(f.kind)))}</g>
      <g {...layerProps(decorLayer)}>{renderFurniture(furniture.filter(f => isDecor(f.kind)))}</g>
    </>
  )
  const cablesJsxFor = (part: 'all' | 'hit' | 'top', system: System) => (
        <g {...layerProps(layerOf(system))}>
        {cables.filter(c => systemOfLine(c.type) === system).map(cable => {
          const polyline = cablePolyline(cable, electric, rooms)
          if (!polyline) return null
          return (
            <CableView
              key={cable.id} cable={cable} polyline={polyline} k={viewport.k} part={part}
              selected={selection?.type === 'cable' && selection.id === cable.id}
              onSelect={e => interaction.selectCable(e, cable.id)}
              onWaypointPointerDown={(e, index) => interaction.beginWaypointDrag(e, cable.id, index)}
              onInsertPointerDown={(e, index, at) => interaction.beginWaypointInsert(e, cable.id, index, at)}
            />
          )
        })}
        </g>
  )
  const labelsJsx = (
    <>
        {rooms.map(room => (
          <RoomLabels
            key={room.id} room={room} k={viewport.k} showDimensions={mode !== 'electro'}
            onEditDimension={editableRooms ? (edge => setEditing({ roomId: room.id, edge })) : undefined}
          />
        ))}
    </>
  )
  // okna, dveře a další stavební prvky se upravují jen v záložce Půdorys; jinde nereagují na myš
  const obstaclesJsx = (
    <g pointerEvents={canEditInMode('obstacle', mode) ? undefined : 'none'}>
        {obstacles.map(obstacle => {
          const room = rooms.find(r => r.id === obstacle.roomId)
          if (!room) return null
          return (
            <ObstacleView
              key={obstacle.id} obstacle={obstacle} room={room} walls={walls} k={viewport.k}
              swingStyle={mode === 'plan' ? 'arc' : 'shadow'}
              selected={selection?.type === 'obstacle' && selection.id === obstacle.id}
              onPointerDown={e => interaction.beginItemDrag(e, { collection: 'obstacles', id: obstacle.id })}
            />
          )
        })}
    </g>
  )
  const pointsJsxFor = (system: System) => (
        <g {...layerProps(layerOf(system))}>
        {electric.filter(p => systemOfPoint(p.kind) === system).map(point => {
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
        </g>
  )

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
            key={room.id} room={room} thicknesses={walls.thicknesses(room)} visibleEdges={walls.visibility(room)} k={viewport.k}
            highlightedEdge={hoveredWall?.roomId === room.id ? hoveredWall.edge : null}
            editable={editableRooms}
            selected={selection?.type === 'room' && selection.id === room.id}
            onBodyPointerDown={e => interaction.beginRoomDrag(e, room.id)}
            onEdgePointerDown={(e, edge) => interaction.beginEdgeDrag(e, room.id, edge)}
          />
        ))}

        {furnitureJsx}

        {/* V záložce Elektro je elektro úplně nahoře, nad stoupačkami, dveřmi i popisky, ať se nic neschová: viditelné čáry kabelů
            a jejich úchyty jsou nad elektro body (nad rozvaděčem), jen plocha pro kliknutí na kabel zůstává pod body.
            Jinak jsou popisky nad nábytkem a okna, dveře a elektro body ještě výš, ať jdou vždy chytit. */}
        {/* v záložce Elektro / Vodoinstalace je aktivní instalace nahoře; druhá prosvítá pod ní */}
        {mode === 'electro' || mode === 'plumbing'
          ? <>{cablesJsxFor('all', inactiveSystem)}{labelsJsx}{obstaclesJsx}{pointsJsxFor(inactiveSystem)}{cablesJsxFor('hit', activeSystem)}{pointsJsxFor(activeSystem)}{cablesJsxFor('top', activeSystem)}</>
          : <>{cablesJsxFor('all', 'plumbing')}{cablesJsxFor('all', 'electro')}{labelsJsx}{obstaclesJsx}{pointsJsxFor('plumbing')}{pointsJsxFor('electro')}</>}


        {/* vzdálenosti vybraného elektro bodu od zdí a okolí (jen v záložce Elektro) */}
        {distanceLines.length > 0 && <DistanceDims lines={distanceLines} k={viewport.k} />}

        {handleItem && handleRoom && (
          <ItemHandles
            item={handleItem} room={handleRoom} walls={walls} inWall={handleItem.inWall} k={viewport.k}
            onPointerDown={(e, end) => interaction.beginItemResize(e, { collection: handleItem.collection, id: handleItem.id }, end)}
          />
        )}

        {interaction.drawRect && (
          <rect {...interaction.drawRect} fill="#2f6fed22" stroke="#2f6fed" strokeWidth={2 * viewport.k}
            strokeDasharray={`${6 * viewport.k}`} pointerEvents='none' />
        )}
      </svg>

      {editing && editedRoom && (
        <EdgeLengthEditor room={editedRoom} edge={editing.edge} viewport={viewport} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
