import { useMemo } from 'react'
import * as THREE from 'three'
import { CABLE_TYPES } from '../../domain/electricCatalog'
import type { Cable, ElectricPoint, Pt, Room } from '../../domain/types'
import { boardSize, electricPosition, type Pos3 } from '../../geometry/electric'
import { SelectionBox } from './SelectionBox'
import type { ThreeEvent } from '@react-three/fiber'

/** Poloměr neviditelného válce kolem vedení, za který ho jde chytit myší (cm). */
const PICK_RADIUS = 2.5

/** Plán (x, y, výška z) -> 3D (x, výška, z = y). */
const toVector = (p: Pos3) => new THREE.Vector3(p.x, p.z, p.y)

/** Materiál, který se u "rentgenu" kreslí přes všechno ostatní (zdi, strop, nábytek). */
function Material({ color, xray, emissive }: { color: string; xray: boolean; emissive?: string }) {
  return (
    <meshStandardMaterial key={xray ? 'xray' : 'normal'} color={color} emissive={emissive} depthTest={!xray} transparent={xray} />
  )
}

interface PointProps {
  point: ElectricPoint
  room: Room
  xray: boolean
  selected: boolean
  /** Stisk myši na bodu (výběr a začátek přesouvání); dostává jeho polohu v půdorysu. */
  onGrab: (e: ThreeEvent<PointerEvent>, center: Pt) => void
}

/** Zásuvka, vypínač, rozvaděč (na zdi) a světlo (na stropě). Lokální osa z míří od zdi do místnosti. */
export function ElectricPointMesh({ point, room, xray, selected, onGrab }: PointProps) {
  const p = electricPosition(point, room)
  const order = xray ? 10 : 0
  const board = boardSize(point)   // u rozvaděče je počátek skupiny na jeho horní hraně (p.z), skříň visí pod ním
  return (
    <group position={[p.x, p.z, p.y]} rotation={[0, -p.rot, 0]} userData={{ pickable: 'point' }} onPointerDown={e => onGrab(e, { x: p.x, y: p.y })}>
      {selected && (point.kind === 'board'
        ? <SelectionBox size={[board.w, board.h, board.d]} center={[0, -board.h / 2, board.d / 2]} />
        : <SelectionBox size={[20, 20, 20]} center={[0, 0, 6]} />)}
      {point.kind === 'socket' && (
        <mesh position={[0, 0, 0.8]} renderOrder={order}><boxGeometry args={[8, 8, 1.6]} /><Material color="#ffffff" xray={xray} /></mesh>
      )}
      {point.kind === 'socket-double' && (
        <mesh position={[0, 0, 0.8]} renderOrder={order}><boxGeometry args={[8, 16, 1.6]} /><Material color="#ffffff" xray={xray} /></mesh>
      )}
      {point.kind === 'switch' && (
        <mesh position={[0, 0, 0.8]} renderOrder={order}><boxGeometry args={[8, 8, 1.6]} /><Material color="#f1efe6" xray={xray} /></mesh>
      )}
      {point.kind === 'board' && (
        <mesh position={[0, -board.h / 2, board.d / 2]} renderOrder={order}>
          <boxGeometry args={[board.w, board.h, board.d]} /><Material color="#9aa5b1" xray={xray} />
        </mesh>
      )}
      {/* vodoinstalace: výtok (baterie), přípojka s vodoměrem, ohřívač a odpady; lokální osa z míří od zdi do místnosti */}
      {point.kind === 'tap' && (
        <>
          <mesh position={[0, 0, 2.5]} rotation={[Math.PI / 2, 0, 0]} renderOrder={order}><cylinderGeometry args={[1.3, 1.3, 5, 12]} /><Material color="#b9c4d0" xray={xray} /></mesh>
          <mesh position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]} renderOrder={order}><cylinderGeometry args={[2.4, 2.4, 1.2, 16]} /><Material color="#2f80ed" xray={xray} /></mesh>
        </>
      )}
      {point.kind === 'water-main' && (
        <>
          <mesh position={[0, 0, 4]} renderOrder={order}><boxGeometry args={[12, 8, 8]} /><Material color="#2f80ed" xray={xray} /></mesh>
          <mesh position={[0, 0, 8.4]} rotation={[Math.PI / 2, 0, 0]} renderOrder={order}><cylinderGeometry args={[3.2, 3.2, 1, 16]} /><Material color="#e8ecef" xray={xray} /></mesh>
        </>
      )}
      {point.kind === 'boiler' && (
        <mesh position={[0, 0, 14]} renderOrder={order}><cylinderGeometry args={[12, 12, 45, 24]} /><Material color="#e8ecef" xray={xray} /></mesh>
      )}
      {(point.kind === 'drain' || point.kind === 'drain-wc' || point.kind === 'sewer') && (
        <mesh position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]} renderOrder={order}>
          <cylinderGeometry args={point.kind === 'drain' ? [2.5, 2.5, 2, 16] : point.kind === 'drain-wc' ? [5.5, 5.5, 2, 20] : [6, 6, 2.5, 20]} />
          <Material color={point.kind === 'drain' ? '#8d8f93' : point.kind === 'drain-wc' ? '#5d6066' : '#4a4d52'} xray={xray} />
        </mesh>
      )}
      {point.kind === 'light' && (
        <mesh position={[0, -1.5, 0]} renderOrder={order}>
          <cylinderGeometry args={[12, 12, 3, 24]} />
          <Material color="#fff3b0" emissive="#ffe27a" xray={xray} />
        </mesh>
      )}
    </group>
  )
}

/** Jeden rovný úsek kabelu jako válec mezi dvěma body. */
function Segment({ a, b, color, radius, xray, onSelect }: {
  a: Pos3; b: Pos3; color: string; radius: number; xray: boolean; onSelect?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const { position, quaternion, length } = useMemo(() => {
    const from = toVector(a), to = toVector(b)
    const direction = to.clone().sub(from)
    return {
      position: from.clone().add(to).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      length: direction.length(),
    }
  }, [a, b])
  if (length < 0.01) return null
  return (
    <>
      <mesh position={position} quaternion={quaternion} renderOrder={xray ? 10 : 0}>
        <cylinderGeometry args={[radius, radius, length, 8]} />
        <Material color={color} xray={xray} />
      </mesh>
      {/* neviditelný silnější válec: tenké vedení by se myší těžko trefovalo */}
      {onSelect && (
        <mesh position={position} quaternion={quaternion} onPointerDown={onSelect}>
          <cylinderGeometry args={[Math.max(radius * 3, PICK_RADIUS), Math.max(radius * 3, PICK_RADIUS), length, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  )
}

/** Kabel jako řetěz válců s kuličkami v ohybech. Je to skutečná trasa, tedy i svislé úseky ve zdech. */
export function CableMesh({ cable, polyline, xray, highlighted, onSelect }: {
  cable: Cable; polyline: Pos3[]; xray: boolean; highlighted: boolean; onSelect?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const spec = CABLE_TYPES[cable.type]
  const radius = spec.radius * (highlighted ? 1.6 : 1)
  return (
    <>
      {polyline.slice(0, -1).map((a, i) => (
        <Segment key={i} a={a} b={polyline[i + 1]} color={spec.color} radius={radius} xray={xray} onSelect={onSelect} />
      ))}
      {polyline.slice(1, -1).map((p, i) => (
        <mesh key={`j${i}`} position={toVector(p)} renderOrder={xray ? 10 : 0}>
          <sphereGeometry args={[radius, 8, 8]} />
          <Material color={spec.color} xray={xray} />
        </mesh>
      ))}
    </>
  )
}
