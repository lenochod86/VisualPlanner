import { OBSTACLE_KINDS } from '../../domain/catalog'
import type { ThreeEvent } from '@react-three/fiber'
import type { Obstacle, Pt, Room } from '../../domain/types'
import { resolvePlacement, wallThicknessFor } from '../../geometry/placement'
import type { WallModel } from '../../geometry/walls'
import { SelectionBox } from './SelectionBox'

/** Šířka rámu okna/dveří (cm). */
const FRAME = 5

type Vec3 = [number, number, number]
const Box = ({ pos, size, color, opacity = 1 }: { pos: Vec3; size: Vec3; color: string; opacity?: number }) => (
  <mesh position={pos}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
  </mesh>
)

/** Okno: bílý rám a skleněná výplň. Lokální počátek je uprostřed otvoru, dole. */
function WindowModel({ w, h, depth }: { w: number; h: number; depth: number }) {
  return (
    <>
      <Box pos={[0, FRAME / 2, 0]} size={[w, FRAME, depth]} color="#ffffff" />
      <Box pos={[0, h - FRAME / 2, 0]} size={[w, FRAME, depth]} color="#ffffff" />
      <Box pos={[-w / 2 + FRAME / 2, h / 2, 0]} size={[FRAME, h - 2 * FRAME, depth]} color="#ffffff" />
      <Box pos={[w / 2 - FRAME / 2, h / 2, 0]} size={[FRAME, h - 2 * FRAME, depth]} color="#ffffff" />
      <Box pos={[0, h / 2, 0]} size={[w - 2 * FRAME, h - 2 * FRAME, 1.5]} color="#9fd3ee" opacity={0.35} />
    </>
  )
}

/** Otvor ve zdi: jen obložení (boky a překlad), žádná výplň. */
function OpeningModel({ w, h, depth }: { w: number; h: number; depth: number }) {
  return (
    <>
      <Box pos={[-w / 2 + FRAME / 2, h / 2, 0]} size={[FRAME, h, depth]} color="#e6e1d8" />
      <Box pos={[w / 2 - FRAME / 2, h / 2, 0]} size={[FRAME, h, depth]} color="#e6e1d8" />
      <Box pos={[0, h - FRAME / 2, 0]} size={[w, FRAME, depth]} color="#e6e1d8" />
    </>
  )
}

/** Dveře: zárubeň (boky a překlad) a hnědé křídlo s klikou. */
function DoorModel({ w, h, depth }: { w: number; h: number; depth: number }) {
  return (
    <>
      <Box pos={[-w / 2 + FRAME / 2, h / 2, 0]} size={[FRAME, h, depth]} color="#e6e1d8" />
      <Box pos={[w / 2 - FRAME / 2, h / 2, 0]} size={[FRAME, h, depth]} color="#e6e1d8" />
      <Box pos={[0, h - FRAME / 2, 0]} size={[w, FRAME, depth]} color="#e6e1d8" />
      <Box pos={[0, (h - FRAME) / 2, 0]} size={[w - 2 * FRAME, h - FRAME, 4]} color="#9b6b43" />
      <Box pos={[w / 2 - FRAME - 8, Math.min(100, h * 0.5), 3]} size={[3, 12, 3]} color="#c9ccd1" />
    </>
  )
}

interface Props {
  obstacle: Obstacle
  room: Room
  walls: WallModel
  selected: boolean
  /** Stisk myši na prvku (výběr a začátek přesouvání); dostává jeho střed v půdorysu. */
  onGrab: (e: ThreeEvent<PointerEvent>, center: Pt) => void
}

export function ObstacleMesh({ obstacle, room, walls, selected, onGrab }: Props) {
  const spec = OBSTACLE_KINDS[obstacle.kind]
  const p = resolvePlacement(obstacle, room, walls, spec.inWall)
  // okna a dveře leží v otvoru ve zdi (ten je vyříznutý v WallsMesh); rám je o něco tenčí než zeď
  const depth = spec.inWall ? Math.min(wallThicknessFor(obstacle, room, walls), 12) : obstacle.d

  return (
    <group
      position={[p.x, obstacle.elev, p.y]} rotation={[0, -p.rot, 0]}
      onPointerDown={e => onGrab(e, { x: p.x, y: p.y })}
    >
      {selected && <SelectionBox size={[obstacle.w, obstacle.h, depth]} center={[0, obstacle.h / 2, 0]} />}
      {obstacle.kind === 'window' && <WindowModel w={obstacle.w} h={obstacle.h} depth={depth} />}
      {obstacle.kind === 'door' && <DoorModel w={obstacle.w} h={obstacle.h} depth={depth} />}
      {obstacle.kind === 'opening' && <OpeningModel w={obstacle.w} h={obstacle.h} depth={depth} />}
      {!spec.inWall && (
        // stoupačka, topení: obyčejný kvádr
        <mesh position={[0, obstacle.h / 2, 0]}>
          <boxGeometry args={[obstacle.w, obstacle.h, obstacle.d]} />
          <meshStandardMaterial color={spec.color} />
        </mesh>
      )}
    </group>
  )
}
