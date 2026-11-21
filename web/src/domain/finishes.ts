// Povrchy místností: materiály a barvy podlah a stěn a funkce, které z nastavení místnosti vyrobí výslednou barvu.
import { ROOM_TYPES } from './catalog'
import { WALL_MATERIALS } from './materials'
import type { FloorMaterial, Room } from './types'

export const FLOOR_MATERIALS: Record<FloorMaterial, { label: string; color: string }> = {
  parquet:  { label: 'Dřevěná podlaha', color: '#b98a5a' },
  laminate: { label: 'Laminát',         color: '#cfa876' },
  tile:     { label: 'Dlažba',          color: '#b9bec4' },
  carpet:   { label: 'Koberec',         color: '#a9a39a' },
  concrete: { label: 'Beton / stěrka',  color: '#9fa2a6' },
}

/** Rychlý výběr barev pro malbu stěn a podlah. */
export const PAINT_SWATCHES: { label: string; color: string }[] = [
  { label: 'Bílá',          color: '#f4f1ea' },
  { label: 'Krémová',       color: '#efe3c8' },
  { label: 'Béžová',        color: '#d9c7a8' },
  { label: 'Světle šedá',   color: '#d4d6d8' },
  { label: 'Šedá',          color: '#9a9ea3' },
  { label: 'Antracit',      color: '#4a4f55' },
  { label: 'Světle modrá',  color: '#bcd7ea' },
  { label: 'Tyrkysová',     color: '#9ccfcf' },
  { label: 'Šalvějová',     color: '#b6c9ad' },
  { label: 'Zelená',        color: '#7ea77f' },
  { label: 'Žlutá',         color: '#ecd98a' },
  { label: 'Terakota',      color: '#c98a6b' },
]

/** Výchozí výška obkladu (cm), když ji uživatel nezadá. */
export const DEFAULT_TILE_HEIGHT = 200

/** Barva podlahy: vlastní, jinak barva materiálu, jinak (bez nastavení) barva podle typu místnosti. */
export function floorColor(room: Room): string {
  if (!room.floor) return ROOM_TYPES[room.type].color
  return room.floor.color ?? FLOOR_MATERIALS[room.floor.material].color
}

/** Barva zdi u stěny `edge`: vlastní, jinak barva jejího materiálu. */
export function wallColor(room: Room, edge: number): string {
  return room.wallColors?.[edge] ?? WALL_MATERIALS[room.wallMaterials[edge] ?? 'plaster'].color
}

/** Výška obkladu, nejvýš po strop. */
export function tileHeight(room: Room): number {
  return Math.min(Math.max(room.tileHeight ?? DEFAULT_TILE_HEIGHT, 10), room.height)
}
