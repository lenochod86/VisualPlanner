import { useCallback, useEffect, useState, type RefObject, type WheelEvent } from 'react'
import type { Pt } from '../../domain/types'
import { clamp } from '../../geometry/math'

const MIN_SCALE = 0.15
const MAX_SCALE = 6

export interface Viewport {
  /** cm na jeden pixel obrazovky; tím se násobí vše, co má mít pevnou velikost na obrazovce (písmo, čáry) */
  k: number
  /** pixelů na cm */
  scale: number
  /** viditelná oblast ve světových souřadnicích (cm) */
  box: { x: number; y: number; w: number; h: number }
  size: { w: number; h: number }
  toWorld: (e: { clientX: number; clientY: number }) => Pt
  toScreen: (p: Pt) => { left: number; top: number }
  onWheel: (e: WheelEvent) => void
  panByPixels: (dx: number, dy: number) => void
  fitTo: (b: { minX: number; maxX: number; minY: number; maxY: number }) => void
}

/** Zoom/posun SVG plátna. `wrapRef` je kontejner (měří se jeho velikost), `svgRef` samotné SVG. */
export function useViewport(wrapRef: RefObject<HTMLElement | null>, svgRef: RefObject<SVGSVGElement | null>): Viewport {
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState({ cx: 225, cy: 175, scale: 1.2 })

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(wrapRef.current!)
    return () => observer.disconnect()
  }, [wrapRef])

  const k = 1 / view.scale
  const box = { x: view.cx - size.w * k / 2, y: view.cy - size.h * k / 2, w: size.w * k, h: size.h * k }

  const toWorld: Viewport['toWorld'] = e => {
    const inverse = svgRef.current!.getScreenCTM()!.inverse()
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(inverse)
    return { x: p.x, y: p.y }
  }

  const toScreen: Viewport['toScreen'] = p => ({ left: (p.x - box.x) * view.scale, top: (p.y - box.y) * view.scale })

  const onWheel: Viewport['onWheel'] = e => {
    const under = toWorld(e)
    const scale = clamp(view.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1), MIN_SCALE, MAX_SCALE)
    const rect = svgRef.current!.getBoundingClientRect()
    // bod pod kurzorem zůstane při zoomu na místě
    setView({
      scale,
      cx: under.x - ((e.clientX - rect.left) - size.w / 2) / scale,
      cy: under.y - ((e.clientY - rect.top) - size.h / 2) / scale,
    })
  }

  const panByPixels: Viewport['panByPixels'] = useCallback((dx, dy) => {
    setView(v => ({ ...v, cx: v.cx - dx / v.scale, cy: v.cy - dy / v.scale }))
  }, [])

  const fitTo: Viewport['fitTo'] = b => {
    const margin = 80
    const w = b.maxX - b.minX + margin * 2, h = b.maxY - b.minY + margin * 2
    setView({
      cx: (b.minX + b.maxX) / 2,
      cy: (b.minY + b.maxY) / 2,
      scale: clamp(Math.min(size.w / w, size.h / h), MIN_SCALE, 4),
    })
  }

  return { k, scale: view.scale, box, size, toWorld, toScreen, onWheel, panByPixels, fitTo }
}
