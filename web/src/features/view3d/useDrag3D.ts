import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback } from 'react'
import * as THREE from 'three'
import type { Pt } from '../../domain/types'
import { dragTargetTo, type DragTarget } from '../interaction/dragTargets'
import { beginGesture, endGesture } from '../../store/history'
import { useUiStore, type Selection } from '../../store/uiStore'

const SELECTION_TYPE: Record<DragTarget['collection'], NonNullable<Selection>['type']> = {
  obstacles: 'obstacle',
  furniture: 'furniture',
  electric: 'electric',
}

/** Pomocná značka objektů, které zakrývají vše za sebou (zdi, plný strop): `userData.occluder`. */
interface HitLike { distance: number; object: { userData?: { occluder?: boolean } } }

/**
 * Je objekt, do kterého míří paprsek ve vzdálenosti `distance`, zakrytý? Tj. leží před ním (blíž ke kameře)
 * nějaký zakrývající objekt. Takový objekt není vidět, a tak ho nejde chytit ani tahat.
 */
export function isOccluded(hits: HitLike[], distance: number): boolean {
  return hits.some(h => h.object.userData?.occluder === true && h.distance < distance - 0.5)
}

/** Funkce, kterou volá 3D objekt při stisku myši: vybere ho a začne ho tahat po podlaze. */
export type GrabHandler = (e: ThreeEvent<PointerEvent>, target: DragTarget, center: Pt) => void

/**
 * Přesouvání objektů ve 3D. Kurzor se promítne do vodorovné roviny ve výšce místa, které uživatel chytil;
 * výsledek (x, z) je přesně půdorysná poloha, takže se použije stejná logika jako v 2D plánu
 * (snap ke zdi, přechod do jiné místnosti). Celé tažení je jeden krok v undo.
 */
export function useDrag3D(): GrabHandler {
  const camera = useThree(s => s.camera)
  const gl = useThree(s => s.gl)
  const controls = useThree(s => s.controls) as unknown as { enabled: boolean } | null

  return useCallback<GrabHandler>((e, target, center) => {
    if (e.nativeEvent.button !== 0) return        // pravé / prostřední tlačítko patří kameře
    // Objekt za zdí není vidět, takže ho nechytíme a pohyb myši patří kameře. Výjimkou je elektro v režimu
    // "rentgen": ten se kreslí přes zdi, tedy je vidět a jde chytit.
    const seenThroughWalls = target.collection === 'electric' && useUiStore.getState().electroView === 'xray'
    if (!seenThroughWalls && isOccluded(e.intersections, e.distance)) return
    e.stopPropagation()
    useUiStore.getState().select({ type: SELECTION_TYPE[target.collection], id: target.id })

    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -e.point.y)
    const hit = new THREE.Vector3()
    const toPlan = (ev: PointerEvent): Pt | null => {
      const rect = gl.domElement.getBoundingClientRect()
      raycaster.setFromCamera(
        new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1),
        camera,
      )
      return raycaster.ray.intersectPlane(plane, hit) ? { x: hit.x, y: hit.z } : null
    }

    // střed objektu se drží stejně daleko od kurzoru, jako když ho uživatel chytil (žádný "skok")
    const grab = toPlan(e.nativeEvent) ?? { x: e.point.x, y: e.point.z }
    const offset = { x: center.x - grab.x, y: center.y - grab.y }

    if (controls) controls.enabled = false          // kamera se při tažení neotáčí
    beginGesture()

    const onMove = (ev: PointerEvent) => {
      const p = toPlan(ev)
      if (p) dragTargetTo(target, { x: p.x + offset.x, y: p.y + offset.y })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      endGesture()
      if (controls) controls.enabled = true
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [camera, gl, controls])
}
