import type { Furniture, Room } from '../../domain/types'
import { resolvePlacement } from '../../geometry/placement'
import type { WallModel } from '../../geometry/walls'
import { FURNITURE_MODELS } from './furnitureModels'

interface Props {
  furniture: Furniture
  room: Room
  walls: WallModel
  /** 0-1; menší hodnota udělá nábytek průhledný (aby šlo vidět za něj). */
  opacity: number
}

/**
 * Kus nábytku jako skupina těles. Lokální osy skupiny: x = šířka, z = hloubka (+z míří od zdi do místnosti),
 * stejně jako v půdorysu, takže otočení kolem Y o -rot sedí na 2D symbol.
 */
export function FurnitureMesh({ furniture: f, room, walls, opacity }: Props) {
  const p = resolvePlacement(f, room, walls)
  return (
    <group position={[p.x, f.elev, p.y]} rotation={[0, -p.rot, 0]}>
      {FURNITURE_MODELS[f.kind].map((part, i) => {
        const partOpacity = (part.opacity ?? 1) * opacity
        const size: [number, number, number] = [
          (part.x[1] - part.x[0]) * f.w, (part.y[1] - part.y[0]) * f.h, (part.z[1] - part.z[0]) * f.d,
        ]
        const position: [number, number, number] = [
          ((part.x[0] + part.x[1]) / 2 - 0.5) * f.w, ((part.y[0] + part.y[1]) / 2) * f.h, ((part.z[0] + part.z[1]) / 2 - 0.5) * f.d,
        ]
        return (
          <mesh key={i} position={position} scale={size}>
            {part.shape === 'box' ? <boxGeometry args={[1, 1, 1]} /> : <cylinderGeometry args={[0.5, 0.5, 1, 24]} />}
            <meshStandardMaterial color={part.color} transparent={partOpacity < 1} opacity={partOpacity} depthWrite={partOpacity >= 1} />
          </mesh>
        )
      })}
    </group>
  )
}
