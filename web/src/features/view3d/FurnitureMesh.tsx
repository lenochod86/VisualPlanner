import type { Furniture, Pt, Room } from '../../domain/types'
import { resolvePlacement } from '../../geometry/placement'
import type { WallModel } from '../../geometry/walls'
import { FURNITURE_MODELS } from './furnitureModels'
import { SelectionBox } from './SelectionBox'
import type { ThreeEvent } from '@react-three/fiber'

interface Props {
  furniture: Furniture
  room: Room
  walls: WallModel
  /** 0-1; menší hodnota udělá nábytek průhledný (aby šlo vidět za něj). */
  opacity: number
  selected: boolean
  /** Má kolizi? Kolem kusu se pak kreslí červený rámeček. */
  issue: boolean
  /** Stisk myši na nábytku (výběr a začátek přesouvání); dostává jeho střed v půdorysu. */
  onGrab: (e: ThreeEvent<PointerEvent>, center: Pt) => void
}

/**
 * Kus nábytku jako skupina těles. Lokální osy skupiny: x = šířka, z = hloubka (+z míří od zdi do místnosti),
 * stejně jako v půdorysu, takže otočení kolem Y o -rot sedí na 2D symbol.
 */
export function FurnitureMesh({ furniture: f, room, walls, opacity, selected, issue, onGrab }: Props) {
  const p = resolvePlacement(f, room, walls)
  return (
    <group position={[p.x, f.elev, p.y]} rotation={[0, -p.rot, 0]} onPointerDown={e => onGrab(e, { x: p.x, y: p.y })}>
      {(selected || issue) && <SelectionBox size={[f.w, f.h, f.d]} center={[0, f.h / 2, 0]} color={selected ? '#2f6fed' : '#d32f2f'} />}
      {FURNITURE_MODELS[f.kind].map((part, i) => {
        const partOpacity = (part.opacity ?? 1) * opacity
        const size: [number, number, number] = [
          (part.x[1] - part.x[0]) * f.w, (part.y[1] - part.y[0]) * f.h, (part.z[1] - part.z[0]) * f.d,
        ]
        const position: [number, number, number] = [
          ((part.x[0] + part.x[1]) / 2 - 0.5) * f.w, ((part.y[0] + part.y[1]) / 2) * f.h, ((part.z[0] + part.z[1]) / 2 - 0.5) * f.d,
        ]
        return (
          // 'cylz': válec leží podélně (osa od zdi do místnosti): otočí se o 90° kolem x, a protože se měřítko
          // použije před otočením, jeho osa y je hloubka a osa z výška
          <mesh
            key={i} position={position}
            rotation={part.shape === 'cylz' ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
            scale={part.shape === 'cylz' ? [size[0], size[2], size[1]] : size}
          >
            {part.shape === 'box' ? <boxGeometry args={[1, 1, 1]} /> : <cylinderGeometry args={[0.5, 0.5, 1, 24]} />}
            {/* key: three.js přepnutí `transparent` za běhu bez překompilování shaderu nepromítne (alfa zůstane 1), proto nový materiál */}
            <meshStandardMaterial
              key={partOpacity < 1 ? 'transparent' : 'opaque'}
              color={part.color} transparent={partOpacity < 1} opacity={partOpacity} depthWrite={partOpacity >= 1} />
          </mesh>
        )
      })}
    </group>
  )
}
