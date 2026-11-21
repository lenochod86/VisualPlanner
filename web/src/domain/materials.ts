// Materiály zdí a druhy stropů (popisky, barvy, výchozí hodnoty).
import type { Ceiling, CeilingType, WallMaterial } from './types'

export const WALL_MATERIALS: Record<WallMaterial, { label: string; color: string }> = {
  plaster:  { label: 'Omítka (bílá)',   color: '#f4f1ea' },
  brick:    { label: 'Cihla',           color: '#b5654a' },
  concrete: { label: 'Beton',           color: '#9a9c9f' },
  tile:     { label: 'Obklad',          color: '#cfe3e8' },
  sdk:      { label: 'SDK příčka',      color: '#e4e2dc' },
}

export const CEILING_TYPES: Record<CeilingType, string> = {
  none: 'Bez stropu',
  slab: 'Strop (omítnutý)',
  sdk:  'SDK podhled',
}

export const DEFAULT_WALL_MATERIAL: WallMaterial = 'plaster'

export const DEFAULT_CEILING: Ceiling = {
  type: 'slab',
  drop: 10,            // SDK podhled visí 10 cm pod stropem
  profileSpacing: 40,  // rozteč nosných CD profilů
  crossSpacing: 100,   // rozteč příčných profilů
}
