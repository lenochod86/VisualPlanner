import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { buildOpenings } from '../../geometry/openings'
import { useProjectStore } from '../../store/projectStore'
import { useWallModel } from '../../store/useWallModel'
import { buildWallSolids } from './wallGeometry'

/** Všechny zdi bytu (s otvory pro okna a dveře); průhlednost se nastavuje posuvníkem v panelu. */
export function WallsMesh({ opacity }: { opacity: number }) {
  const rooms = useProjectStore(s => s.rooms)
  const obstacles = useProjectStore(s => s.obstacles)
  const walls = useWallModel()
  const solids = useMemo(
    () => buildWallSolids(rooms, walls, buildOpenings(rooms, obstacles, walls)),
    [rooms, obstacles, walls],
  )
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
