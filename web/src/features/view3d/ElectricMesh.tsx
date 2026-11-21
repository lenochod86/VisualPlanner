import { useMemo } from 'react'
import * as THREE from 'three'
import { CABLE_TYPES } from '../../domain/electricCatalog'
import type { Cable, ElectricPoint, Room } from '../../domain/types'
import { electricPosition, type Pos3 } from '../../geometry/electric'

/** Plán (x, y, výška z) -> 3D (x, výška, z = y). */
const toVector = (p: Pos3) => new THREE.Vector3(p.x, p.z, p.y)

/** Materiál, který se u "rentgenu" kreslí přes všechno ostatní (zdi, strop, nábytek). */
function Material({ color, xray, emissive }: { color: string; xray: boolean; emissive?: string }) {
  return (
    <meshStandardMaterial color={color} emissive={emissive} depthTest={!xray} transparent={xray} />
  )
}

/** Zásuvka, vypínač, rozvaděč (na zdi) a světlo (na stropě). Lokální osa z míří od zdi do místnosti. */
export function ElectricPointMesh({ point, room, xray }: { point: ElectricPoint; room: Room; xray: boolean }) {
  const p = electricPosition(point, room)
  const order = xray ? 10 : 0
  return (
    <group position={[p.x, p.z, p.y]} rotation={[0, -p.rot, 0]}>
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
        <mesh position={[0, 0, 6]} renderOrder={order}><boxGeometry args={[40, 60, 12]} /><Material color="#9aa5b1" xray={xray} /></mesh>
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
function Segment({ a, b, color, radius, xray }: { a: Pos3; b: Pos3; color: string; radius: number; xray: boolean }) {
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
    <mesh position={position} quaternion={quaternion} renderOrder={xray ? 10 : 0}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <Material color={color} xray={xray} />
    </mesh>
  )
}

/** Kabel jako řetěz válců s kuličkami v ohybech. Je to skutečná trasa, tedy i svislé úseky ve zdech. */
export function CableMesh({ cable, polyline, xray, highlighted }: { cable: Cable; polyline: Pos3[]; xray: boolean; highlighted: boolean }) {
  const spec = CABLE_TYPES[cable.type]
  const radius = spec.radius * (highlighted ? 1.6 : 1)
  return (
    <>
      {polyline.slice(0, -1).map((a, i) => (
        <Segment key={i} a={a} b={polyline[i + 1]} color={spec.color} radius={radius} xray={xray} />
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
