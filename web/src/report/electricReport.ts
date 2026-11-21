// Bilance instalace (elektro i vodoinstalace): kolik je kterých bodů, kolik metrů kterého vedení a po okruzích / rozvodech.
// Čisté funkce nad projektem (žádné UI), aby šly testovat a použít pro export.
import { CABLE_RESERVE } from '../config'
import { CABLE_TYPES, ELECTRIC_KINDS, kindsOf, systemOfLine, systemOfPoint, type System } from '../domain/electricCatalog'
import type { CableType, PipeType, PointKind, Project } from '../domain/types'
import { cablePolyline, polylineLength } from '../geometry/electric'
import { countElbows, countTees, sticksToBuy } from '../geometry/fittings'

type KindCounts = Record<PointKind, number>

export interface RoomRow { room: string; counts: KindCounts }
export interface CircuitRow { circuit: string; types: CableType[]; cables: number; lengthM: number }
export interface TypeRow {
  type: CableType
  cables: number
  lengthM: number
  /** Kolik koupit: délka s rezervou zaokrouhlená nahoru na celé metry. */
  orderM: number
  /** Jen potrubí: tvarovky a trubky k nákupu. */
  fittings?: PipeFittings
}

/** Tvarovky a trubky jednoho typu potrubí. */
export interface PipeFittings {
  elbow90: number
  elbow45: number
  /** T-kusy: v bodě, kde se stýkají aspoň tři trubky, jsou o dvě méně než trubek. */
  tee: number
  /** Kolik trubek (tyčí) koupit s rezervou, nahoru na celé kusy. */
  sticks: number
}

export interface ElectricReport {
  system: System
  rooms: RoomRow[]
  totals: KindCounts
  circuits: CircuitRow[]
  types: TypeRow[]
  totalLengthM: number
}

const NO_CIRCUIT = '(bez označení)'
const emptyCounts = (): KindCounts =>
  Object.fromEntries((Object.keys(ELECTRIC_KINDS) as PointKind[]).map(k => [k, 0])) as KindCounts

/** Bilance jednoho systému (výchozí elektro); body a vedení druhého systému se nepočítají. */
export function buildElectricReport(
  project: Pick<Project, 'rooms' | 'electric' | 'cables'>, system: System = 'electro',
): ElectricReport {
  const { rooms } = project
  const electric = project.electric.filter(p => systemOfPoint(p.kind) === system)
  const cables = project.cables.filter(c => systemOfLine(c.type) === system)

  // body podle místností
  const roomRows = rooms.map(room => ({ room: room.name, counts: emptyCounts() }))
  const totals = emptyCounts()
  for (const point of electric) {
    const row = roomRows[rooms.findIndex(r => r.id === point.roomId)]
    if (row) row.counts[point.kind]++
    totals[point.kind]++
  }

  // kabely podle okruhů a typů
  const circuits = new Map<string, CircuitRow>()
  const types = new Map<CableType, TypeRow>()
  for (const cable of cables) {
    const polyline = cablePolyline(cable, electric, rooms)
    if (!polyline) continue                                   // kabel bez konce se nepočítá
    const lengthM = polylineLength(polyline) / 100

    const name = cable.circuit.trim() || NO_CIRCUIT
    const circuit = circuits.get(name) ?? { circuit: name, types: [], cables: 0, lengthM: 0 }
    if (!circuit.types.includes(cable.type)) circuit.types.push(cable.type)
    circuit.cables++
    circuit.lengthM += lengthM
    circuits.set(name, circuit)

    const typeRow = types.get(cable.type) ?? { type: cable.type, cables: 0, lengthM: 0, orderM: 0 }
    typeRow.cables++
    typeRow.lengthM += lengthM
    if (system === 'plumbing') {
      const elbows = countElbows(polyline)
      const fittings = typeRow.fittings ?? { elbow90: 0, elbow45: 0, tee: 0, sticks: 0 }
      fittings.elbow90 += elbows.elbow90
      fittings.elbow45 += elbows.elbow45
      typeRow.fittings = fittings
    }
    types.set(cable.type, typeRow)
  }
  const typeRows = [...types.values()].map(t => {
    const row = { ...t, orderM: Math.ceil(t.lengthM * CABLE_RESERVE) }
    if (row.fittings) {
      row.fittings = {
        ...row.fittings,
        tee: countTees(cables.filter(c => c.type === t.type)),
        sticks: sticksToBuy(t.type as PipeType, t.lengthM * 100, CABLE_RESERVE),
      }
    }
    return row
  })

  return {
    system,
    rooms: roomRows,
    totals,
    circuits: [...circuits.values()].sort((a, b) => a.circuit.localeCompare(b.circuit, 'cs', { numeric: true })),
    types: typeRows.sort((a, b) => CABLE_TYPES[a.type].label.localeCompare(CABLE_TYPES[b.type].label, 'cs', { numeric: true })),
    totalLengthM: typeRows.reduce((sum, t) => sum + t.lengthM, 0),
  }
}

const decimal = (n: number) => n.toFixed(2).replace('.', ',')
const cell = (value: string | number) => {
  const text = String(value)
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV pro české Excely: oddělovač středník, desetinná čárka, na začátku BOM kvůli diakritice. */
export function reportToCsv(report: ElectricReport): string {
  const kinds = kindsOf(report.system)
  const plumbing = report.system === 'plumbing'
  const line = (...cells: (string | number)[]) => cells.map(cell).join(';')
  const rows: string[] = [
    line(plumbing ? 'Soupis vodoinstalace' : 'Soupis elektroinstalace'),
    '',
    line('Body podle místností'),
    line('Místnost', ...kinds.map(k => ELECTRIC_KINDS[k].label)),
    ...report.rooms.map(r => line(r.room, ...kinds.map(k => r.counts[k]))),
    line('Celkem', ...kinds.map(k => report.totals[k])),
    '',
    line(plumbing ? 'Rozvody' : 'Okruhy'),
    line(plumbing ? 'Rozvod' : 'Okruh', plumbing ? 'Typ potrubí' : 'Typ kabelu', plumbing ? 'Počet úseků' : 'Počet kabelů', 'Délka [m]'),
    ...report.circuits.map(c => line(c.circuit, c.types.map(t => CABLE_TYPES[t].label).join(', '), c.cables, decimal(c.lengthM))),
    '',
    line(plumbing ? 'Potrubí celkem' : 'Kabely celkem'),
    line(plumbing ? 'Typ potrubí' : 'Typ kabelu', plumbing ? 'Počet úseků' : 'Počet kabelů', 'Délka [m]', `K nákupu s rezervou ${Math.round((CABLE_RESERVE - 1) * 100)} % [m]`),
    ...report.types.map(t => line(CABLE_TYPES[t.type].label, t.cables, decimal(t.lengthM), t.orderM)),
    line('Celkem', '', decimal(report.totalLengthM), ''),
    ...(plumbing ? [
      '',
      line('Tvarovky a trubky'),
      line('Typ potrubí', 'Koleno 90°', 'Koleno 45°', 'T-kus', 'Trubek k nákupu [ks]'),
      ...report.types.map(t => line(CABLE_TYPES[t.type].label, t.fittings?.elbow90 ?? 0, t.fittings?.elbow45 ?? 0, t.fittings?.tee ?? 0, t.fittings?.sticks ?? 0)),
    ] : []),
  ]
  return '﻿' + rows.join('\r\n') + '\r\n'
}
