// Katalog instalačních bodů a vedení: elektro (zásuvky, kabely) i vodoinstalace (výtoky, potrubí).
import type { CableType, ElectricCableType, ElectricKind, PipeType, PlumbingKind, PointKind } from './types'

/** Instalační systém: každá záložka (Elektro, Vodoinstalace) upravuje jen svůj. */
export type System = 'electro' | 'plumbing'

interface PointSpec {
  label: string
  system: System
  /** Na zdi (zásuvka, vypínač, rozvaděč, výtok…) nebo na stropě (světlo). */
  mount: 'wall' | 'ceiling'
  /** Výchozí výška nad podlahou u nástěnných bodů (cm). */
  height: number
  /** Velikost symbolu v půdorysu (cm). */
  size: number
}

export const ELECTRIC_KINDS: Record<PointKind, PointSpec> = {
  socket:          { label: 'Zásuvka',          system: 'electro', mount: 'wall',    height: 30,  size: 8 },
  'socket-double': { label: 'Zásuvka dvojitá',  system: 'electro', mount: 'wall',    height: 30,  size: 8 },
  switch:          { label: 'Vypínač',          system: 'electro', mount: 'wall',    height: 105, size: 8 },
  board:           { label: 'Rozvaděč',         system: 'electro', mount: 'wall',    height: 150, size: 14 },
  light:           { label: 'Světlo',           system: 'electro', mount: 'ceiling', height: 0,   size: 12 },
  'water-main':    { label: 'Přípojka vody',    system: 'plumbing', mount: 'wall',   height: 30,  size: 10 },
  boiler:          { label: 'Ohřívač vody',     system: 'plumbing', mount: 'wall',   height: 120, size: 14 },
  tap:             { label: 'Výtok (baterie)',  system: 'plumbing', mount: 'wall',   height: 85,  size: 8 },
  drain:           { label: 'Odpad DN50',       system: 'plumbing', mount: 'wall',   height: 40,  size: 8 },
  'drain-wc':      { label: 'Odpad WC DN110',   system: 'plumbing', mount: 'wall',   height: 20,  size: 11 },
  sewer:           { label: 'Odpadní stoupačka', system: 'plumbing', mount: 'wall',  height: 20,  size: 12 },
}

interface LineSpec {
  label: string
  system: System
  color: string
  /** Poloměr vedení ve 3D (cm); skutečný je zhruba poloviční, zvětšeno kvůli čitelnosti. */
  radius: number
}

export const CABLE_TYPES: Record<CableType, LineSpec> = {
  'cyky-3x1.5': { label: 'CYKY-J 3×1,5 (světla)',        system: 'electro', color: '#e6b800', radius: 0.7 },
  'cyky-3x2.5': { label: 'CYKY-J 3×2,5 (zásuvky)',       system: 'electro', color: '#e0483a', radius: 0.8 },
  'cyky-5x1.5': { label: 'CYKY-J 5×1,5 (střídače)',      system: 'electro', color: '#3a8ee0', radius: 0.8 },
  'cyky-5x2.5': { label: 'CYKY-J 5×2,5 (třífázové)',     system: 'electro', color: '#8a4de0', radius: 0.9 },
  'cyky-5x4':   { label: 'CYKY-J 5×4 (sporák, trouba)',  system: 'electro', color: '#2fa36b', radius: 1.0 },
  'pipe-cold':      { label: 'Studená voda PPR 20',  system: 'plumbing', color: '#2f80ed', radius: 1.0 },
  'pipe-hot':       { label: 'Teplá voda PPR 20',    system: 'plumbing', color: '#d9342b', radius: 1.0 },
  'pipe-drain-50':  { label: 'Odpad HT 50',          system: 'plumbing', color: '#8d8f93', radius: 1.6 },
  'pipe-drain-110': { label: 'Odpad HT 110',         system: 'plumbing', color: '#5d6066', radius: 2.4 },
}

export const SYSTEM_LABEL: Record<System, string> = { electro: 'Elektro', plumbing: 'Vodoinstalace' }

export const kindsOf = (system: System): PointKind[] =>
  (Object.keys(ELECTRIC_KINDS) as PointKind[]).filter(k => ELECTRIC_KINDS[k].system === system)
export const lineTypesOf = (system: System): CableType[] =>
  (Object.keys(CABLE_TYPES) as CableType[]).filter(t => CABLE_TYPES[t].system === system)

export const systemOfPoint = (kind: PointKind): System => ELECTRIC_KINDS[kind].system
export const systemOfLine = (type: CableType): System => CABLE_TYPES[type].system

/** Odpadní potrubí (ostatní vedení vody je tlakové). */
export const isDrainPipe = (type: CableType) => type === 'pipe-drain-50' || type === 'pipe-drain-110'

export type { ElectricCableType, ElectricKind, PipeType, PlumbingKind }

/** Výchozí rozměry rozvaděče (šířka × výška × hloubka, cm). */
export const BOARD_DEFAULT_SIZE = { w: 40, h: 60, d: 12 }
