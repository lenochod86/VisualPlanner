import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { WALL_MATERIALS } from '../../domain/materials'
import { OCCLUDE_MIN_OPACITY } from '../../config'
import { buildOpenings } from '../../geometry/openings'
import { useProjectStore } from '../../store/projectStore'
import { useWallModel } from '../../store/useWallModel'
import { buildWallSolids } from './wallGeometry'

const noop = () => {}

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
        // zeď zakrývá objekty za sebou (pro myš), dokud není průhledná; handler je tu kvůli tomu, aby se zeď
        // započítala do paprsku, sám nic nedělá
        <mesh key={i} geometry={solid.geometry} onPointerDown={noop} userData={{ occluder: opacity >= OCCLUDE_MIN_OPACITY }}>
          <meshStandardMaterial color={WALL_MATERIALS[rooms.find(r => r.id === solid.roomId)?.wallMaterials[solid.edge] ?? 'plaster'].color} side={THREE.DoubleSide}
            transparent={transparent} opacity={opacity} depthWrite={!transparent} />
        </mesh>
      ))}
    </>
  )
}
