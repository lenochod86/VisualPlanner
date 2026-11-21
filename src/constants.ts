import type { ObsKind, RoomType } from './types'

export const ROOM_TYPES: Record<RoomType, { label: string; color: string }> = {
  living:   { label: 'Obývák',   color: '#e8d9b5' },
  bedroom:  { label: 'Ložnice',  color: '#c9d6ee' },
  kitchen:  { label: 'Kuchyň',   color: '#f1d1b0' },
  bathroom: { label: 'Koupelna', color: '#b9e0e6' },
  toilet:   { label: 'Záchod',   color: '#cfe8c9' },
  hall:     { label: 'Chodba',   color: '#dcdcdc' },
  other:    { label: 'Jiné',     color: '#eadcf0' },
}

export const OBS_KINDS: Record<ObsKind, { label: string; w: number; d: number; h: number; elev: number; color: string; wall: boolean }> = {
  riser:    { label: 'Stoupačka', w: 15,  d: 15, h: 260, elev: 0,   color: '#8a8a8a', wall: false },
  radiator: { label: 'Topení',    w: 100, d: 10, h: 60,  elev: 10,  color: '#f2f2f2', wall: false },
  window:   { label: 'Okno',      w: 120, d: 12, h: 140, elev: 90,  color: '#7ec8f0', wall: true },
  door:     { label: 'Dveře',     w: 90,  d: 12, h: 205, elev: 0,   color: '#9b6b43', wall: true },
}

export const SNAP = 5       // krok přichytávání v cm
export const MIN_EDGE = 30  // minimální délka stěny
