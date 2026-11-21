// Katalog elektroinstalačních bodů a kabelů.
import type { CableType, ElectricKind } from './types'

interface ElectricSpec {
  label: string
  /** Na zdi (zásuvka, vypínač, rozvaděč) nebo na stropě (světlo). */
  mount: 'wall' | 'ceiling'
  /** Výchozí výška nad podlahou u nástěnných bodů (cm). */
  height: number
  /** Velikost symbolu v půdorysu (cm). */
  size: number
}

export const ELECTRIC_KINDS: Record<ElectricKind, ElectricSpec> = {
  socket:          { label: 'Zásuvka',          mount: 'wall',    height: 30,  size: 8 },
  'socket-double': { label: 'Zásuvka dvojitá',  mount: 'wall',    height: 30,  size: 8 },
  switch:          { label: 'Vypínač',          mount: 'wall',    height: 105, size: 8 },
  board:           { label: 'Rozvaděč',         mount: 'wall',    height: 150, size: 14 },
  light:           { label: 'Světlo',           mount: 'ceiling', height: 0,   size: 12 },
}

interface CableSpec {
  label: string
  color: string
  /** Poloměr kabelu ve 3D (cm); skutečný je zhruba poloviční, zvětšeno kvůli čitelnosti. */
  radius: number
}

export const CABLE_TYPES: Record<CableType, CableSpec> = {
  'cyky-3x1.5': { label: 'CYKY-J 3×1,5 (světla)',        color: '#e6b800', radius: 0.7 },
  'cyky-3x2.5': { label: 'CYKY-J 3×2,5 (zásuvky)',       color: '#e0483a', radius: 0.8 },
  'cyky-5x1.5': { label: 'CYKY-J 5×1,5 (střídače)',      color: '#3a8ee0', radius: 0.8 },
  'cyky-5x2.5': { label: 'CYKY-J 5×2,5 (třífázové)',     color: '#8a4de0', radius: 0.9 },
  'cyky-5x4':   { label: 'CYKY-J 5×4 (sporák, trouba)',  color: '#2fa36b', radius: 1.0 },
}
