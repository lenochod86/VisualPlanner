import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OCCLUDE_MIN_OPACITY } from '../../config'
import { wallColor } from '../../domain/finishes'
import { WALL_MATERIALS } from '../../domain/materials'
import type { Room } from '../../domain/types'
import { buildOpenings } from '../../geometry/openings'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { useWallModel } from '../../store/useWallModel'
import { buildWallSolids, wallFacesCamera } from './wallGeometry'

const noop = () => {}

/** Barva tělesa zdi: vlastní barva / materiál stěny; nad obkladem omítka. */
function solidColor(room: Room | undefined, solid: { edge: number; zone: string }): string {
  if (!room) return WALL_MATERIALS.plaster.color
  return solid.zone === 'above-tile' ? WALL_MATERIALS.plaster.color : wallColor(room, solid.edge)
}

/** Neprůhlednost "přední" stěny, když je zapnuté průhledné zobrazení přední stěn. */
const GHOST_FRONT_OPACITY = 0.1

/**
 * Všechny zdi bytu (s otvory pro okna a dveře). Průhlednost všech zdí se nastavuje posuvníkem v panelu;
 * navíc se při zapnuté volbě průběžně zprůhledňují "přední" stěny, tedy ty, které hledí na kameru,
 * aby šlo vidět dovnitř a plánovat.
 */
export function WallsMesh({ opacity }: { opacity: number }) {
  const rooms = useProjectStore(s => s.rooms)
  const obstacles = useProjectStore(s => s.obstacles)
  const ghostFront = useUiStore(s => s.ghostFrontWalls)
  const walls = useWallModel()
  const solids = useMemo(
    () => buildWallSolids(rooms, walls, buildOpenings(rooms, obstacles, walls)),
    [rooms, obstacles, walls],
  )
  useEffect(() => () => solids.forEach(s => s.geometry.dispose()), [solids])

  // Materiál s průhledností musí být průhledný od začátku (three.js přepnutí za běhu nepromítne), proto key níž.
  const transparent = opacity < 1 || ghostFront
  const meshes = useRef<(THREE.Mesh | null)[]>([])

  // Každý snímek: stěny hledící na kameru zprůhlednit, ostatní nechat na nastavené neprůhlednosti.
  useFrame(({ camera }) => {
    const cam = { x: camera.position.x, y: camera.position.z }    // 3D z odpovídá y v půdorysu
    solids.forEach((solid, i) => {
      const mesh = meshes.current[i]
      if (!mesh) return
      const material = mesh.material as THREE.MeshStandardMaterial
      const target = ghostFront && wallFacesCamera(solid.outward, solid.center, cam) ? Math.min(opacity, GHOST_FRONT_OPACITY) : opacity
      material.opacity = target
      material.depthWrite = target >= 1                           // průsvitná stěna nezakrývá, co je za ní
      mesh.userData.occluder = target >= OCCLUDE_MIN_OPACITY       // a nezakrývá ani pro myš
    })
  })

  return (
    <>
      {solids.map((solid, i) => (
        // zeď zakrývá objekty za sebou (pro myš), dokud není průhledná; handler je tu kvůli tomu, aby se zeď
        // započítala do paprsku, sám nic nedělá
        <mesh
          key={i} ref={el => { meshes.current[i] = el }} geometry={solid.geometry}
          onPointerDown={noop} userData={{ occluder: opacity >= OCCLUDE_MIN_OPACITY }}
        >
          <meshStandardMaterial
            key={transparent ? 'transparent' : 'opaque'}
            color={solidColor(rooms.find(r => r.id === solid.roomId), solid)}
            side={THREE.DoubleSide} transparent={transparent} opacity={opacity} depthWrite={opacity >= 1}
          />
        </mesh>
      ))}
    </>
  )
}
