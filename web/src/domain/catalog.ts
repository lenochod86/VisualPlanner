// Katalog typů místností a překážek (výchozí rozměry, barvy, popisky).
import type { ObstacleKind, RoomType } from './types'

export const ROOM_TYPES: Record<RoomType, { label: string; color: string }> = {
  living:   { label: 'Obývák',   color: '#e8d9b5' },
  bedroom:  { label: 'Ložnice',  color: '#c9d6ee' },
  kitchen:  { label: 'Kuchyň',   color: '#f1d1b0' },
  bathroom: { label: 'Koupelna', color: '#b9e0e6' },
  toilet:   { label: 'Záchod',   color: '#cfe8c9' },
  hall:     { label: 'Chodba',   color: '#dcdcdc' },
  other:    { label: 'Jiné',     color: '#eadcf0' },
}

interface ObstacleSpec {
  label: string
  w: number; d: number; h: number; elev: number
  color: string
  /** Okna a dveře leží přímo ve zdi a nemohou stát volně v místnosti. */
  inWall: boolean
  /** Půdorysný tvar je kruh (elipsa o rozměrech šířka × hloubka), jinak obdélník. */
  round?: boolean
  /** Stojí volně v prostoru: ke zdi se při tažení přichytí jen těsně (pevné body, sloupy). */
  freestanding?: boolean
}

export const OBSTACLE_KINDS: Record<ObstacleKind, ObstacleSpec> = {
  riser:    { label: 'Stoupačka', w: 15,  d: 15, h: 260, elev: 0,  color: '#8a8a8a', inWall: false },
  radiator: { label: 'Topení',    w: 100, d: 10, h: 60,  elev: 10, color: '#f2f2f2', inWall: false },
  window:   { label: 'Okno',      w: 120, d: 12, h: 140, elev: 90, color: '#7ec8f0', inWall: true },
  door:     { label: 'Dveře',     w: 90,  d: 12, h: 205, elev: 0,  color: '#9b6b43', inWall: true },
  // otvor ve zdi bez výplně (průchod); výšku a výšku od podlahy lze upravit, takže jde i o průchozí okno
  opening:  { label: 'Otvor',     w: 100, d: 12, h: 205, elev: 0,  color: '#ffffff', inWall: true },
  // pevné body v místnosti (sloup, komín, pilíř): překážky, kolem kterých se plánuje; kruh nebo obdélník
  'fixed-round': { label: 'Pevný bod - kruh',      w: 30, d: 30, h: 260, elev: 0, color: '#6b6f75', inWall: false, round: true, freestanding: true },
  'fixed-rect':  { label: 'Pevný bod - obdélník',  w: 40, d: 30, h: 260, elev: 0, color: '#6b6f75', inWall: false, freestanding: true },
}
