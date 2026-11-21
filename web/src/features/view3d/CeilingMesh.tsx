import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Room } from '../../domain/types'
import { ceilingLevel, PROFILE_HEIGHT, PROFILE_WIDTH, profileSegments, SDK_BOARD } from '../../geometry/ceiling'
import type { CeilingView } from '../../store/uiStore'
import { extrudeFootprint } from './wallGeometry'

const SLAB_THICKNESS = 2   // vrstva omítky na stropě, kterou vidíme zespodu

/**
 * Strop místnosti. SDK podhled = deska + pod ní (zde nad ní) rastr CD profilů.
 * V režimu "transparent" je deska skoro průhledná, takže je vidět rastr profilů.
 */
export function CeilingMesh({ room, view }: { room: Room; view: Exclude<CeilingView, 'off'> }) {
  const { type } = room.ceiling
  const level = ceilingLevel(room)
  const thickness = type === 'sdk' ? SDK_BOARD : SLAB_THICKNESS

  const board = useMemo(() => {
    const ring = room.pts.map(p => [p.x, p.y] as [number, number])
    return extrudeFootprint([[ring]], level - thickness, level)
  }, [room.pts, level, thickness])
  useEffect(() => () => board.dispose(), [board])

  const { main, cross } = useMemo(
    () => (type === 'sdk' ? profileSegments(room) : { main: [], cross: [] }),
    [room.pts, room.ceiling, type],
  )

  if (type === 'none') return null
  const ghost = view === 'transparent'
  const profileY = level + PROFILE_HEIGHT / 2       // profily leží nad deskou

  return (
    <>
      {/* plný strop zakrývá objekty pod sebou (pro myš); průhledný ne */}
      <mesh geometry={board} onPointerDown={() => {}} userData={{ occluder: !ghost }}>
        <meshStandardMaterial
          color={type === 'sdk' ? '#f7f7f5' : '#ececec'} side={THREE.DoubleSide}
          transparent={ghost} opacity={ghost ? 0.18 : 1} depthWrite={!ghost} />
      </mesh>

      {/* hlavní profily (podél x) a příčné (podél y); příčné jsou o výšku profilu výš, aby se neprotínaly */}
      {main.map((s, i) => <Profile key={`m${i}`} a={s.a} b={s.b} y={profileY} />)}
      {cross.map((s, i) => <Profile key={`c${i}`} a={s.a} b={s.b} y={profileY + PROFILE_HEIGHT} />)}
    </>
  )
}

function Profile({ a, b, y }: { a: { x: number; y: number }; b: { x: number; y: number }; y: number }) {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  const horizontal = Math.abs(b.y - a.y) < 1e-6
  return (
    <mesh position={[(a.x + b.x) / 2, y, (a.y + b.y) / 2]}>
      <boxGeometry args={horizontal ? [length, PROFILE_HEIGHT, PROFILE_WIDTH] : [PROFILE_WIDTH, PROFILE_HEIGHT, length]} />
      <meshStandardMaterial color="#8a9199" metalness={0.5} roughness={0.5} />
    </mesh>
  )
}
