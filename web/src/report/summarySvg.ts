// Závěrečná stránka(y) tisku: soupis elektra, vodoinstalace a SDK podhledů (body, metráže, kusy k nákupu).
// Čistá funkce bez prohlížeče; rozměry stránky se přebírají od výkresů, ať jsou všechny listy stejné.
import { CABLE_TYPES, ELECTRIC_KINDS, kindsOf, type System } from '../domain/electricCatalog'
import type { Project } from '../domain/types'
import { buildCeilingReport, PROFILE_PIECE_LENGTH } from './ceilingReport'
import { buildElectricReport } from './electricReport'

const MARGIN = 10
const ROW = 4.6          // výška řádku tabulky (mm)
const FONT = 2.9
const COLUMN_GAP = 8
const COLUMNS = 2

/** Jedna tabulka soupisu. `weights` určují poměr šířek sloupců, první sloupec je text, ostatní se zarovnají doprava. */
export interface SummaryTable {
  title: string
  header: string[]
  rows: string[][]
  total?: string[]
  weights: number[]
}

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const decimal = (v: number, digits = 1) => v.toFixed(digits).replace('.', ',')
const shortLabel = (label: string) => label.split(' (')[0]

/** Tabulky jednoho instalačního systému (elektro / voda): počty bodů, vedení podle typu a podle okruhů. */
function installationTables(project: Project, system: System): SummaryTable[] {
  const report = buildElectricReport(project, system)
  const plumbing = system === 'plumbing'
  const prefix = plumbing ? 'Vodoinstalace' : 'Elektro'
  const kinds = kindsOf(system).filter(k => report.totals[k] > 0)
  if (kinds.length === 0 && report.types.length === 0) return []

  const tables: SummaryTable[] = []
  if (kinds.length > 0) {
    tables.push({
      title: `${prefix}: body`, header: ['Druh', 'Počet'], weights: [3, 1],
      rows: kinds.map(k => [ELECTRIC_KINDS[k].label, String(report.totals[k])]),
    })
  }
  if (report.types.length > 0) {
    tables.push({
      title: plumbing ? 'Vodoinstalace: potrubí' : 'Elektro: kabely',
      header: [plumbing ? 'Typ potrubí' : 'Typ kabelu', plumbing ? 'Úseků' : 'Kabelů', 'Trasa [m]', 'Koupit [m]'], weights: [3.4, 1, 1.3, 1.3],
      rows: report.types.map(t => [shortLabel(CABLE_TYPES[t.type].label), String(t.cables), decimal(t.lengthM), String(t.orderM)]),
      total: ['Celkem', '', decimal(report.totalLengthM), String(report.types.reduce((sum, t) => sum + t.orderM, 0))],
    })
  }
  if (report.circuits.length > 0) {
    tables.push({
      title: plumbing ? 'Vodoinstalace: rozvody' : 'Elektro: okruhy',
      header: [plumbing ? 'Rozvod' : 'Okruh', plumbing ? 'Úseků' : 'Kabelů', 'Délka [m]'], weights: [3.4, 1, 1.3],
      rows: report.circuits.map(c => [c.circuit, String(c.cables), decimal(c.lengthM)]),
    })
  }
  return tables
}

/** Tabulky SDK podhledů: profily po místnostech a nákupní souhrn (CD nosné i příčné, UD obvodové, desky). */
function ceilingTables(project: Project): SummaryTable[] {
  const { rooms, totals } = buildCeilingReport(project)
  if (rooms.length === 0) return []
  const piece = PROFILE_PIECE_LENGTH / 100
  return [
    {
      title: 'SDK podhled: profily po místnostech', header: ['Místnost', 'Plocha [m²]', 'CD [m]', 'UD [m]'], weights: [3, 1.4, 1.2, 1.2],
      rows: rooms.map(r => [r.room, decimal(r.areaM2), decimal(r.mainM + r.crossM), decimal(r.perimeterM)]),
      total: ['Celkem', decimal(totals.areaM2), decimal(totals.cdM), decimal(totals.udM)],
    },
    {
      title: 'SDK podhled: k nákupu', header: ['Materiál', 'Metráž', `Kusů po ${decimal(piece, 0)} m`], weights: [3.4, 1.3, 1.5],
      rows: [
        ['Profil CD 60/27 (nosné a příčné)', `${decimal(totals.cdM)} m`, String(totals.cdPieces)],
        ['Profil UD 28/27 (obvodový)', `${decimal(totals.udM)} m`, String(totals.udPieces)],
        ['SDK desky 12,5 mm', `${decimal(totals.areaM2)} m²`, '-'],
      ],
    },
  ]
}

/** Všechny tabulky soupisu v pořadí: elektro, voda, SDK podhledy. */
export function summaryTables(project: Project): SummaryTable[] {
  return [...installationTables(project, 'electro'), ...installationTables(project, 'plumbing'), ...ceilingTables(project)]
}

const tableHeight = (t: SummaryTable) => ROW * (2 + t.rows.length + (t.total ? 1 : 0)) + 5   // nadpis, záhlaví, řádky, mezera

/** Vykreslí jednu tabulku na pozici (x, y) v šířce `width`. */
function tableSvg(t: SummaryTable, x: number, y: number, width: number): string {
  const sum = t.weights.reduce((a, b) => a + b, 0)
  const widths = t.weights.map(w => (w / sum) * width)
  const starts = widths.map((_, i) => x + widths.slice(0, i).reduce((a, b) => a + b, 0))
  const cell = (text: string, i: number, row: number, bold = false) => {
    const first = i === 0
    const chars = Math.max(3, Math.floor(widths[i] / (FONT * 0.52)))
    const shown = text.length > chars ? `${text.slice(0, chars - 1)}…` : text
    const tx = first ? starts[i] + 1 : starts[i] + widths[i] - 1
    return `<text x="${tx.toFixed(2)}" y="${(y + ROW * row + ROW * 0.72).toFixed(2)}" font-size="${FONT}" ${bold ? 'font-weight="bold" ' : ''}text-anchor="${first ? 'start' : 'end'}" fill="#222">${escapeXml(shown)}</text>`
  }
  const out: string[] = [
    `<text x="${x}" y="${(y + ROW * 0.75).toFixed(2)}" font-size="${FONT + 0.7}" font-weight="bold" fill="#111">${escapeXml(t.title)}</text>`,
    `<line x1="${x}" y1="${(y + ROW * 2).toFixed(2)}" x2="${x + width}" y2="${(y + ROW * 2).toFixed(2)}" stroke="#222" stroke-width="0.3"/>`,
    ...t.header.map((h, i) => cell(h, i, 1, true)),
  ]
  t.rows.forEach((row, r) => {
    row.forEach((c, i) => out.push(cell(c, i, 2 + r)))
    out.push(`<line x1="${x}" y1="${(y + ROW * (3 + r)).toFixed(2)}" x2="${x + width}" y2="${(y + ROW * (3 + r)).toFixed(2)}" stroke="#ddd" stroke-width="0.2"/>`)
  })
  if (t.total) {
    const r = 2 + t.rows.length
    out.push(`<line x1="${x}" y1="${(y + ROW * r).toFixed(2)}" x2="${x + width}" y2="${(y + ROW * r).toFixed(2)}" stroke="#222" stroke-width="0.3"/>`)
    t.total.forEach((c, i) => out.push(cell(c, i, r, true)))
  }
  return out.join('\n')
}

export interface SummaryPage { svg: string; pageWidth: number; pageHeight: number }

/**
 * Stránky soupisu: tabulky se skládají do dvou sloupců shora dolů; když se nevejdou, pokračuje se na další stránce.
 * Rozměr stránky se předává zvenku (stejný jako u výkresů).
 */
export function buildSummaryPages(
  project: Project, base: { title: string; date: string }, pageWidth: number, pageHeight: number,
): SummaryPage[] {
  const tables = summaryTables(project)
  if (tables.length === 0) return []
  const top = MARGIN + 12, bottom = pageHeight - MARGIN - 6
  const columnWidth = (pageWidth - 2 * MARGIN - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS

  const pages: string[][] = [[]]
  let column = 0, y = top
  const nextColumn = () => {
    column++
    y = top
    if (column >= COLUMNS) { column = 0; pages.push([]) }
  }
  for (const table of tables) {
    let rest = table, first = true
    while (rest.rows.length > 0) {
      // tabulka se nevejde celá: vezme se tolik řádků, kolik se vejde (aspoň 3), zbytek pokračuje dál se stejným záhlavím
      let fit = rest.rows.length
      while (fit > 3 && y + tableHeight({ ...rest, rows: rest.rows.slice(0, fit), total: fit === rest.rows.length ? rest.total : undefined }) > bottom) fit--
      const whole = fit === rest.rows.length
      const part: SummaryTable = {
        ...rest, title: first ? rest.title : `${table.title} (pokračování)`,
        rows: rest.rows.slice(0, fit), total: whole ? rest.total : undefined,
      }
      if (y + tableHeight(part) > bottom && y > top) { nextColumn(); continue }   // ani minimum se nevejde: nový sloupec
      const x = MARGIN + column * (columnWidth + COLUMN_GAP)
      pages[pages.length - 1].push(tableSvg(part, x, y, columnWidth))
      y += tableHeight(part)
      rest = { ...rest, rows: rest.rows.slice(fit) }
      first = false
      if (!whole) nextColumn()
    }
  }

  return pages.map((content, i) => {
    const heading = `<text x="${MARGIN}" y="${MARGIN + 6}" font-size="5" font-weight="bold" fill="#111">${escapeXml(base.title)} - Soupis${pages.length > 1 ? ` (${i + 1}/${pages.length})` : ''}</text>` +
      `<text x="${MARGIN}" y="${MARGIN + 10.5}" font-size="2.8" fill="#555">Elektro, vodoinstalace a SDK podhledy · ${escapeXml(base.date)} · rezerva na ohyby a odpad 10 %</text>`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageWidth} ${pageHeight}" width="${pageWidth}mm" height="${pageHeight}mm" font-family="Arial, Helvetica, sans-serif">` +
      `<rect width="${pageWidth}" height="${pageHeight}" fill="#fff"/>${heading}${content.join('\n')}</svg>`
    return { svg, pageWidth, pageHeight }
  })
}
