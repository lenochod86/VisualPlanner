// Bilance elektroinstalace: kolik je kterých bodů, kolik metrů kterého kabelu a po okruzích.
// Čisté funkce nad projektem (žádné UI), aby šly testovat a použít pro export.
import { CABLE_RESERVE } from '../config'
import { CABLE_TYPES, ELECTRIC_KINDS } from '../domain/electricCatalog'
import type { CableType, ElectricKind, Project } from '../domain/types'
import { cablePolyline, polylineLength } from '../geometry/electric'

type KindCounts = Record<ElectricKind, number>

export interface RoomRow { room: string; counts: KindCounts }
export interface CircuitRow { circuit: string; types: CableType[]; cables: number; lengthM: number }
export interface TypeRow {
  type: CableType
  cables: number
  lengthM: number
  /** Kolik koupit: délka s rezervou zaokrouhlená nahoru na celé metry. */
  orderM: number
}

export interface ElectricReport {
  rooms: RoomRow[]
  totals: KindCounts
  circuits: CircuitRow[]
  types: TypeRow[]
  totalLengthM: number
}

const NO_CIRCUIT = '(bez okruhu)'
const emptyCounts = (): KindCounts => ({ socket: 0, 'socket-double': 0, switch: 0, board: 0, light: 0 })
const kinds = Object.keys(ELECTRIC_KINDS) as ElectricKind[]

export function buildElectricReport(project: Pick<Project, 'rooms' | 'electric' | 'cables'>): ElectricReport {
  const { rooms, electric, cables } = project

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
    types.set(cable.type, typeRow)
  }
  const typeRows = [...types.values()].map(t => ({ ...t, orderM: Math.ceil(t.lengthM * CABLE_RESERVE) }))

  return {
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
  const line = (...cells: (string | number)[]) => cells.map(cell).join(';')
  const rows: string[] = [
    line('Soupis elektroinstalace'),
    '',
    line('Body podle místností'),
    line('Místnost', ...kinds.map(k => ELECTRIC_KINDS[k].label)),
    ...report.rooms.map(r => line(r.room, ...kinds.map(k => r.counts[k]))),
    line('Celkem', ...kinds.map(k => report.totals[k])),
    '',
    line('Okruhy'),
    line('Okruh', 'Typ kabelu', 'Počet kabelů', 'Délka [m]'),
    ...report.circuits.map(c => line(c.circuit, c.types.map(t => CABLE_TYPES[t].label).join(', '), c.cables, decimal(c.lengthM))),
    '',
    line('Kabely celkem'),
    line('Typ kabelu', 'Počet kabelů', 'Délka [m]', `K nákupu s rezervou ${Math.round((CABLE_RESERVE - 1) * 100)} % [m]`),
    ...report.types.map(t => line(CABLE_TYPES[t.type].label, t.cables, decimal(t.lengthM), t.orderM)),
    line('Celkem', '', decimal(report.totalLengthM), ''),
  ]
  return '﻿' + rows.join('\r\n') + '\r\n'
}
