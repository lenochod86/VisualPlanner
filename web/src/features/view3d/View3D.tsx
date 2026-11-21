import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { cablePolyline } from '../../geometry/electric'
import { bbox } from '../../geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { useFurnitureIssues } from '../../store/useFurnitureIssues'
import { useWallModel } from '../../store/useWallModel'
import { CeilingMesh } from './CeilingMesh'
import { CableMesh, ElectricPointMesh } from './ElectricMesh'
import { isDecor } from '../../domain/furnitureCatalog'
import { FurnitureMesh } from './FurnitureMesh'
import { ObstacleMesh } from './ObstacleMesh'
import { RoomFloor } from './RoomFloor'
import { useDrag3D } from './useDrag3D'
import { WallsMesh } from './WallsMesh'

/** V záložce Elektro je nábytek průsvitný (nejvýš tolik), ať vynikne elektro. */
const ELECTRO_TAB_FURNITURE_OPACITY = 0.15

/** Vlastní 3D scéna; musí být uvnitř <Canvas>, aby mohla používat three.js hooky (např. přesouvání). */
function Scene() {
  const rooms = useProjectStore(s => s.rooms)
  const obstacles = useProjectStore(s => s.obstacles)
  const furniture = useProjectStore(s => s.furniture)
  const electric = useProjectStore(s => s.electric)
  const cables = useProjectStore(s => s.cables)
  const selection = useUiStore(s => s.selection)
  const electroView = useUiStore(s => s.electroView)
  const mode = useUiStore(s => s.mode)
  const inElectroTab = mode === 'electro'
  const wallOpacity = useUiStore(s => s.wallOpacity)
  const furnitureOpacity = useUiStore(s => s.furnitureOpacity)
  const ceilingView = useUiStore(s => s.ceilingView)
  const walls = useWallModel()
  const grab = useDrag3D()
  const issues = useFurnitureIssues()

  const points = rooms.flatMap(r => r.pts)
  const b = points.length ? bbox(points) : { minX: 0, maxX: 400, minY: 0, maxY: 300 }
  const cx = (b.minX + b.maxX) / 2, cz = (b.minY + b.maxY) / 2
  // Konečná mřížka kolem bytu, která se k okraji vytrácí. Nekonečná mřížka s jemnými čarami při pohledu
  // pod malým úhlem vibrovala (moaré), protože se daleko slévaly čáry hustší než pixely.
  const gridSize = Math.max(3000, Math.max(b.maxX - b.minX, b.maxY - b.minY) * 4)
  const isSelected = (type: string, id: string) => selection?.type === type && selection.id === id

  return (
    <>
      <color attach="background" args={['#eef1f5']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[cx + 500, 900, cz + 300]} intensity={1.1} />
      {/* hrubší mřížka (50/500 cm): jemná 10cm mřížka při pohledu pod malým úhlem dělala moaré */}
      <Grid position={[cx, -1, cz]} args={[gridSize, gridSize]} cellSize={100} sectionSize={500}
        cellThickness={0.9} sectionThickness={1.4} cellColor="#d5d9df" sectionColor="#b3b9c2"
        fadeDistance={gridSize * 0.7} fadeStrength={2} />

      {rooms.map(room => <RoomFloor key={room.id} room={room} />)}
      <WallsMesh opacity={wallOpacity} />
      {ceilingView !== 'off' && rooms.map(room => <CeilingMesh key={room.id} room={room} view={ceilingView} />)}

      {furniture.map(item => {
        const room = rooms.find(r => r.id === item.roomId)
        return room && (
          <FurnitureMesh
            key={item.id} furniture={item} room={room} walls={walls} opacity={(inElectroTab || (mode === 'decor' && !isDecor(item.kind)) || (mode === 'equipment' && isDecor(item.kind))) ? Math.min(furnitureOpacity, ELECTRO_TAB_FURNITURE_OPACITY) : furnitureOpacity}
            selected={isSelected('furniture', item.id)}
            issue={issues.some(i => i.furnitureId === item.id)}
            onGrab={(e, center) => grab(e, { collection: 'furniture', id: item.id }, center)}
          />
        )
      })}
      {obstacles.map(obstacle => {
        const room = rooms.find(r => r.id === obstacle.roomId)
        return room && (
          <ObstacleMesh
            key={obstacle.id} obstacle={obstacle} room={room} walls={walls}
            selected={isSelected('obstacle', obstacle.id)}
            onGrab={(e, center) => grab(e, { collection: 'obstacles', id: obstacle.id }, center)}
          />
        )
      })}

      {electroView !== 'off' && (
        <>
          {electric.map(point => {
            // světla se ukazují jen v záložce Elektro; zásuvky, vypínače a rozvaděč jsou vidět vždy
            if (point.kind === 'light' && !inElectroTab) return null
            const room = rooms.find(r => r.id === point.roomId)
            return room && (
              <ElectricPointMesh
                key={point.id} point={point} room={room} xray={electroView === 'xray'}
                selected={isSelected('electric', point.id)}
                onGrab={(e, center) => grab(e, { collection: 'electric', id: point.id }, center)}
              />
            )
          })}
          {/* vedení (kabely) se ukazuje jen v záložce Elektro */}
          {inElectroTab && cables.map(cable => {
            const polyline = cablePolyline(cable, electric, rooms)
            return polyline && (
              <CableMesh key={cable.id} cable={cable} polyline={polyline} xray={electroView === 'xray'}
                highlighted={isSelected('cable', cable.id)} />
            )
          })}
        </>
      )}

      <OrbitControls makeDefault target={[cx, 80, cz]} maxPolarAngle={Math.PI / 2 - 0.02} />
    </>
  )
}

export function View3D() {
  const rooms = useProjectStore(s => s.rooms)
  const select = useUiStore(s => s.select)
  const points = rooms.flatMap(r => r.pts)
  const b = points.length ? bbox(points) : { minX: 0, maxX: 400, minY: 0, maxY: 300 }
  const span = Math.max(b.maxX - b.minX, b.maxY - b.minY, 300)
  const cx = (b.minX + b.maxX) / 2, cz = (b.minY + b.maxY) / 2

  return (
    <Canvas
      camera={{ position: [cx + span * 0.9, span, cz + span * 1.1], fov: 45, near: 20, far: 15000 }}
      onPointerMissed={() => select(null)}   // klik do prázdna zruší výběr (r3f ho nevyvolá po tažení kamery)
    >
      <Scene />
    </Canvas>
  )
}
