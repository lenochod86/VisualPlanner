import type { Viewport } from './useViewport'

/** Mřížka 10 cm (jen při přiblížení) a 100 cm, kreslená vzorkem přes celou viditelnou plochu. */
export function GridBackground({ viewport }: { viewport: Viewport }) {
  const { box, k, scale } = viewport
  return (
    <>
      <defs>
        <pattern id="grid-10" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0H0V10" fill="none" stroke="#e3e6ea" strokeWidth={k} />
        </pattern>
        <pattern id="grid-100" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill={scale > 0.6 ? 'url(#grid-10)' : 'none'} />
          <path d="M100 0H0V100" fill="none" stroke="#c9ced6" strokeWidth={k} />
        </pattern>
      </defs>
      <rect {...box} fill="#fafbfc" />
      <rect {...box} fill="url(#grid-100)" />
    </>
  )
}
