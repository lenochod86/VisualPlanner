import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '../../store/projectStore'
import { useWallModel } from '../../store/useWallModel'
import { buildWallSolids } from './wallGeometry'

/** Všechny zdi bytu jako sjednocená tělesa; průhlednost se nastavuje posuvníkem v panelu. */
export function WallsMesh({ opacity }: { opacity: number }) {
  const rooms = useProjectStore(s => s.rooms)
  const walls = useWallModel()
  const solids = useMemo(() => buildWallSolids(rooms, walls), [rooms, walls])
  useEffect(() => () => solids.forEach(s => s.geometry.dispose()), [solids])

  const transparent = opacity < 1
  return (
    <>
      {solids.map((solid, i) => (
        <mesh key={i} geometry={solid.geometry}>
          <meshStandardMaterial color="#f4f1ea" side={THREE.DoubleSide}
            transparent={transparent} opacity={opacity} depthWrite={!transparent} />
        </mesh>
      ))}
    </>
  )
}
