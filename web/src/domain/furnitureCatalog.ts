// Katalog nábytku: popisky, kategorie a výchozí rozměry v cm (š × h × v). 3D vzhled je ve features/view3d/furnitureModels.ts.
import type { FurnitureKind } from './types'

export type FurnitureCategory = 'bathroom' | 'living' | 'kitchen' | 'appliances'

export const FURNITURE_CATEGORIES: Record<FurnitureCategory, string> = {
  bathroom: 'Koupelna a WC',
  living: 'Obývák a ložnice',
  kitchen: 'Kuchyň',
  appliances: 'Spotřebiče',
}

interface FurnitureSpec {
  label: string
  category: FurnitureCategory
  w: number      // šířka (podél zdi)
  d: number      // hloubka (od zdi)
  h: number
  elev: number   // výška spodní hrany nad podlahou (nástěnné věci)
  color: string  // barva symbolu v půdorysu
}

export const FURNITURE_KINDS: Record<FurnitureKind, FurnitureSpec> = {
  'wc-free':      { label: 'WC volně stojící',  category: 'bathroom', w: 38,  d: 70,  h: 78,  elev: 0,  color: '#ffffff' },
  'wc-wall':      { label: 'WC zabudované',     category: 'bathroom', w: 50,  d: 55,  h: 120, elev: 0,  color: '#e9e9e9' },
  shower:         { label: 'Sprchový kout',     category: 'bathroom', w: 90,  d: 90,  h: 200, elev: 0,  color: '#cfe8f5' },
  bathtub:        { label: 'Vana',              category: 'bathroom', w: 170, d: 70,  h: 60,  elev: 0,  color: '#f4f4f4' },
  sink:           { label: 'Umyvadlo',          category: 'bathroom', w: 60,  d: 45,  h: 20,  elev: 80, color: '#fafafa' },
  'bed-single':   { label: 'Postel 80×200',     category: 'living',   w: 80,  d: 200, h: 90,  elev: 0,  color: '#d9c7a8' },
  'bed-double':   { label: 'Postel 160×200',    category: 'living',   w: 160, d: 200, h: 90,  elev: 0,  color: '#d9c7a8' },
  sofa:           { label: 'Gauč',              category: 'living',   w: 200, d: 90,  h: 85,  elev: 0,  color: '#9fb0c9' },
  table:          { label: 'Stůl',              category: 'living',   w: 160, d: 90,  h: 75,  elev: 0,  color: '#c9a883' },
  chair:          { label: 'Židle',             category: 'living',   w: 45,  d: 45,  h: 90,  elev: 0,  color: '#c9a883' },
  tv:             { label: 'Televize',          category: 'living',   w: 110, d: 6,   h: 65,  elev: 100, color: '#444444' },
  wardrobe:       { label: 'Skříň',             category: 'living',   w: 100, d: 60,  h: 220, elev: 0,  color: '#d7c7ad' },
  'kitchen-unit': { label: 'Kuchyňská linka',   category: 'kitchen',  w: 240, d: 60,  h: 90,  elev: 0,  color: '#e8e4dc' },
  washer:         { label: 'Pračka',            category: 'appliances', w: 60, d: 60, h: 85,  elev: 0, color: '#f4f6f8' },
  dryer:          { label: 'Sušička',           category: 'appliances', w: 60, d: 60, h: 85,  elev: 0, color: '#eef1f4' },
  fridge:         { label: 'Lednice',           category: 'appliances', w: 60, d: 65, h: 185, elev: 0, color: '#e8ecef' },
}
