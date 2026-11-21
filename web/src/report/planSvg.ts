// Tisknutelný půdorys jako SVG ve skutečném měřítku na papíře A4 (jednotky stránky jsou milimetry).
// Čistá funkce bez prohlížeče, takže jde testovat; samotné otevření tisku je v printPlan.ts.
import { CABLE_TYPES, ELECTRIC_KINDS } from '../domain/electricCatalog'
import { FURNITURE_KINDS } from '../domain/furnitureCatalog'
import { OBSTACLE_KINDS, ROOM_TYPES } from '../domain/catalog'
import type { CableType, Project, Pt, Room } from '../domain/types'
import { formatAreaM2 } from '../format'
import { doorSwing } from '../geometry/doors'
import { cablePolyline, electricPosition } from '../geometry/electric'
import { resolvePlacement, wallThicknessFor } from '../geometry/placement'
import { bbox, centroid, edgeInfo, polygonArea } from '../geometry/polygon'
import { buildWallModel, outerPolygon, wallQuad, type WallModel } from '../geometry/walls'

export interface PlanSvgOptions {
  /** Kóty: délky stěn a celkové vnější rozměry. */
  dimensions: boolean
  furniture: boolean
  electro: boolean
  /** Nadpis v razítku. */
  title: string
  /** Datum v razítku (kvůli testům se předává zvenku). */
  date: string
}

export interface PlanSvg {
  svg: string
  /** Rozměry stránky v mm (A4 na výšku nebo na šířku podle tvaru bytu). */
  pageWidth: number
  pageHeight: number
  /** Jmenovatel měřítka (1:`scale`). */
  scale: number
}

const SCALES = [20, 25, 50, 75, 100, 150, 200, 250, 500]
const MARGIN = 10          // okraj stránky (mm)
const TITLE_HEIGHT = 22    // výška razítka (mm)
const DIM_SPACE = 14       // místo pro vnější kóty (mm)

/** Nejdetailnější standardní měřítko, ve kterém se rozměry (cm) vejdou do plochy (mm). */
export function pickScale(widthCm: number, heightCm: number, areaWidthMm: number, areaHeightMm: number): number {
  const fits = (d: number) => (widthCm * 10) / d <= areaWidthMm && (heightCm * 10) / d <= areaHeightMm
  const standard = SCALES.find(fits)
  if (standard) return standard
  // velmi velký objekt: nejbližší vyšší násobek 50
  const needed = Math.max((widthCm * 10) / areaWidthMm, (heightCm * 10) / areaHeightMm)
  return Math.ceil(needed / 50) * 50
}

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const n = (v: number) => String(Math.round(v * 100) / 100)
const ring = (pts: Pt[]) => `M${pts.map(p => `${n(p.x)} ${n(p.y)}`).join('L')}Z`

export function buildPlanSvg(project: Project, options: PlanSvgOptions): PlanSvg {
  const { rooms, obstacles, furniture, cables } = project
  const walls = buildWallModel(rooms)

  // vnější rozměry bytu (včetně zdí)
  const outerPoints = [
    ...rooms.flatMap(r => outerPolygon(r.pts, walls.thicknesses(r))),
    ...doorSwingPoints(rooms, obstacles, walls),   // dveře otevírané ven přesahují obvod bytu
  ]
  const box = outerPoints.length ? bbox(outerPoints) : { minX: 0, maxX: 100, minY: 0, maxY: 100 }
  const widthCm = box.maxX - box.minX, heightCm = box.maxY - box.minY

  // orientace stránky podle tvaru bytu, pak měřítko a umístění výkresu na stránce
  const landscape = heightCm <= widthCm * 1.1
  const pageWidth = landscape ? 297 : 210, pageHeight = landscape ? 210 : 297
  const dimSpace = options.dimensions ? DIM_SPACE : 4
  const areaX = MARGIN + dimSpace, areaY = MARGIN + 4
  const areaW = pageWidth - 2 * MARGIN - 2 * dimSpace
  const areaH = pageHeight - 2 * MARGIN - TITLE_HEIGHT - dimSpace - 4
  const scale = pickScale(widthCm, heightCm, areaW, areaH)
  const s = 10 / scale                                    // mm na papíře na 1 cm skutečnosti
  const drawW = widthCm * s, drawH = heightCm * s
  const ox = areaX + (areaW - drawW) / 2, oy = areaY + (areaH - drawH) / 2

  const mm = (v: number) => v / s                         // mm na papíře -> cm ve výkresu (šířky čar, písmo)
  const body = [
    floorsSvg(rooms),
    wallsSvg(rooms, walls),
    openingsSvg(rooms, obstacles, walls, mm),
    options.furniture ? furnitureSvg(rooms, furniture, walls, mm) : '',
    options.electro ? electroSvg(project, mm) : '',
    labelsSvg(rooms, mm),
    options.dimensions ? edgeDimensionsSvg(rooms, s, mm) : '',
  ].join('\n')

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}mm" height="${pageHeight}mm" viewBox="0 0 ${pageWidth} ${pageHeight}" font-family="Arial, Helvetica, sans-serif">`,
    `<rect width="${pageWidth}" height="${pageHeight}" fill="#fff"/>`,
    `<g transform="translate(${n(ox - box.minX * s)} ${n(oy - box.minY * s)}) scale(${Math.round(s * 1e5) / 1e5})">`,
    body,
    `</g>`,
    options.dimensions ? overallDimensionsSvg(ox, oy, drawW, drawH, widthCm, heightCm) : '',
    titleBlockSvg({ rooms, cables, options, scale, pageWidth, pageHeight }),
    `</svg>`,
  ].join('\n')

  return { svg, pageWidth, pageHeight, scale }
}

// ---- vrstvy výkresu (souřadnice v cm; šířky čar a písmo přes mm()) ----

/** Krajní body zametané plochy všech dveří ve světových souřadnicích (výkres s nimi musí počítat při volbě měřítka). */
function doorSwingPoints(rooms: Room[], obstacles: Project['obstacles'], walls: WallModel): Pt[] {
  return obstacles.flatMap(o => {
    const room = rooms.find(r => r.id === o.roomId)
    if (o.kind !== 'door' || !room || !o.attach) return []
    const p = resolvePlacement(o, room, walls, true)
    const s = doorSwing(o, wallThicknessFor(o, room, walls))
    const cos = Math.cos(p.rot), sin = Math.sin(p.rot)
    return [s.hinge, s.closedEnd, s.openEnd].map(q => ({ x: p.x + cos * q.x - sin * q.y, y: p.y + sin * q.x + cos * q.y }))
  })
}

function floorsSvg(rooms: Room[]): string {
  return rooms.map(r =>
    `<path d="${ring(r.pts)}" fill="${ROOM_TYPES[r.type].color}" fill-opacity="0.45"/>`).join('\n')
}

/** Zdi: čtyřúhelník každé viditelné stěny mezi vnitřním a vnějším lícem (sdílené zdi se překryjí beze změny vzhledu). */
function wallsSvg(rooms: Room[], walls: WallModel): string {
  return rooms.flatMap(r => {
    const thicknesses = walls.thicknesses(r)
    const visible = walls.visibility(r)
    return r.pts.map((_, i) => {
      const j = (i + 1) % r.pts.length
      if (visible[i]) return `<path d="${ring(wallQuad(r.pts, thicknesses, visible, i))}" fill="#3b3f45"/>`
      // skrytá stěna: jen tenká čárkovaná čára na jejím líci
      return `<line x1="${n(r.pts[i].x)}" y1="${n(r.pts[i].y)}" x2="${n(r.pts[j].x)}" y2="${n(r.pts[j].y)}" stroke="#888" stroke-width="0.15" stroke-dasharray="1.5 1" vector-effect="non-scaling-stroke"/>`
    })
  }).join('\n')
}

/** Okna a dveře: bílý řez zdí a značka (okno = tři čáry, dveře = křídlo a oblouk otevírání). */
function openingsSvg(rooms: Room[], obstacles: Project['obstacles'], walls: WallModel, mm: (v: number) => number): string {
  return obstacles.flatMap(o => {
    const spec = OBSTACLE_KINDS[o.kind]
    const room = rooms.find(r => r.id === o.roomId)
    if (!room || !spec.inWall || !o.attach) return []
    const p = resolvePlacement(o, room, walls, true)
    const t = wallThicknessFor(o, room, walls)
    const w = o.w, hx = -w / 2
    const stroke = `stroke="#222" stroke-width="${n(mm(0.25))}" fill="none"`
    const symbol = o.kind === 'window'
      ? [-t / 2, 0, t / 2].map(y => `<line x1="${n(hx)}" y1="${n(y)}" x2="${n(w / 2)}" y2="${n(y)}" ${stroke}/>`).join('')
      : o.kind === 'opening'
      // otvor: jen boky (špalety) přes tloušťku zdi, bez výplně
      ? [hx, w / 2].map(x => `<line x1="${n(x)}" y1="${n(-t / 2)}" x2="${n(x)}" y2="${n(t / 2)}" ${stroke}/>`).join('')
      // dveře: otevřené křídlo (kolmo ke zdi) a oblouk jeho dráhy; strana závěsů a směr otevírání podle dveří
      : (() => {
        const s = doorSwing(o, t)
        return `<line x1="${n(s.hinge.x)}" y1="${n(s.hinge.y)}" x2="${n(s.openEnd.x)}" y2="${n(s.openEnd.y)}" ${stroke}/>` +
          `<path d="M${n(s.closedEnd.x)} ${n(s.closedEnd.y)} A${n(s.radius)} ${n(s.radius)} 0 0 ${s.sweep} ${n(s.openEnd.x)} ${n(s.openEnd.y)}" ${stroke} stroke-dasharray="${n(mm(1))} ${n(mm(0.8))}"/>`
      })()
    return [
      `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n((p.rot * 180) / Math.PI)})">` +
      `<rect x="${n(hx)}" y="${n(-t / 2)}" width="${n(w)}" height="${n(t)}" fill="#fff"/>${symbol}</g>`,
    ]
  }).join('\n')
}

function furnitureSvg(rooms: Room[], furniture: Project['furniture'], walls: WallModel, mm: (v: number) => number): string {
  return furniture.flatMap(f => {
    const room = rooms.find(r => r.id === f.roomId)
    if (!room) return []
    const p = resolvePlacement(f, room, walls)
    const label = FURNITURE_KINDS[f.kind].label
    const fits = Math.min(f.w, f.d) > mm(9)       // na malé ploše název nevyjde
    return [
      `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n((p.rot * 180) / Math.PI)})">` +
      `<rect x="${n(-f.w / 2)}" y="${n(-f.d / 2)}" width="${n(f.w)}" height="${n(f.d)}" fill="#fff" fill-opacity="0.6" stroke="#666" stroke-width="${n(mm(0.18))}"/></g>` +
      (fits ? `<text x="${n(p.x)}" y="${n(p.y)}" font-size="${n(mm(1.8))}" fill="#555" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>` : ''),
    ]
  }).join('\n')
}

function electroSvg(project: Project, mm: (v: number) => number): string {
  const { rooms, electric, cables } = project
  const stroke = `stroke="#222" stroke-width="${n(mm(0.2))}"`

  const lines = cables.flatMap(c => {
    const polyline = cablePolyline(c, electric, rooms)
    if (!polyline) return []
    const pts = polyline.map(p => `${n(p.x)},${n(p.y)}`).join(' ')
    return [`<polyline points="${pts}" fill="none" stroke="${CABLE_TYPES[c.type].color}" stroke-width="${n(mm(0.35))}" stroke-dasharray="${n(mm(1.6))} ${n(mm(0.8))}"/>`]
  })

  const symbols = electric.flatMap(point => {
    const room = rooms.find(r => r.id === point.roomId)
    if (!room) return []
    const p = electricPosition(point, room)
    const r = Math.max(ELECTRIC_KINDS[point.kind].size / 2, mm(1.1))
    const shape =
      point.kind === 'socket' ? `<circle cx="0" cy="${n(r)}" r="${n(r)}" fill="#fff" ${stroke}/>`
      : point.kind === 'socket-double' ? `<circle cx="${n(-r)}" cy="${n(r)}" r="${n(r)}" fill="#fff" ${stroke}/><circle cx="${n(r)}" cy="${n(r)}" r="${n(r)}" fill="#fff" ${stroke}/>`
      : point.kind === 'switch' ? `<circle cx="0" cy="${n(r)}" r="${n(r * 0.8)}" fill="#fff" ${stroke}/><line x1="0" y1="${n(r)}" x2="${n(r)}" y2="${n(r * 1.9)}" ${stroke}/>`
      : point.kind === 'light' ? `<circle r="${n(r)}" fill="#fff" ${stroke}/><path d="M${n(-r * 0.7)} ${n(-r * 0.7)}L${n(r * 0.7)} ${n(r * 0.7)}M${n(-r * 0.7)} ${n(r * 0.7)}L${n(r * 0.7)} ${n(-r * 0.7)}" fill="none" ${stroke}/>`
      : `<rect x="${n(-2 * r)}" y="0" width="${n(4 * r)}" height="${n(2 * r)}" fill="#fff" ${stroke}/>`   // rozvaděč
    return [`<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n((p.rot * 180) / Math.PI)})">${shape}</g>`]
  })
  return [...lines, ...symbols].join('\n')
}

/** Název a plocha místnosti u těžiště. */
function labelsSvg(rooms: Room[], mm: (v: number) => number): string {
  return rooms.map(r => {
    const c = centroid(r.pts)
    return `<text x="${n(c.x)}" y="${n(c.y)}" text-anchor="middle" fill="#222">` +
      `<tspan font-size="${n(mm(3))}" font-weight="bold">${escapeXml(r.name)}</tspan>` +
      `<tspan x="${n(c.x)}" dy="${n(mm(3.4))}" font-size="${n(mm(2.4))}" fill="#555">${formatAreaM2(polygonArea(r.pts))}</tspan></text>`
  }).join('\n')
}

/** Světlé délky stěn (cm) uvnitř místností u každé stěny; svislé stěny mají text otočený podél zdi. */
function edgeDimensionsSvg(rooms: Room[], s: number, mm: (v: number) => number): string {
  const size = 2
  return rooms.flatMap(room => room.pts.map((_, i) => {
    const e = edgeInfo(room.pts, i)
    const label = String(Math.round(e.len))
    if (e.len * s < label.length * size * 0.65 + 2) return ''          // text by se na stěnu nevešel
    const off = mm(2.2)
    const x = (e.a.x + e.b.x) / 2 + e.inward.x * off, y = (e.a.y + e.b.y) / 2 + e.inward.y * off
    const rotate = e.horizontal ? '' : ` transform="rotate(-90 ${n(x)} ${n(y)})"`
    return `<text x="${n(x)}" y="${n(y)}" font-size="${n(mm(size))}" fill="#1b4fbf" text-anchor="middle" dominant-baseline="middle"${rotate}>${label}</text>`
  })).join('\n')
}

// ---- prvky mimo výkres (souřadnice v mm na stránce) ----

/** Vnější kóty celého bytu: šířka pod výkresem, výška vpravo. */
function overallDimensionsSvg(ox: number, oy: number, drawW: number, drawH: number, widthCm: number, heightCm: number): string {
  const line = `stroke="#222" stroke-width="0.2"`
  const tick = (x: number, y: number) => `<line x1="${n(x - 1)}" y1="${n(y + 1)}" x2="${n(x + 1)}" y2="${n(y - 1)}" ${line}/>`
  const yLine = oy + drawH + 6, xLine = ox + drawW + 6
  return [
    `<line x1="${n(ox)}" y1="${n(yLine)}" x2="${n(ox + drawW)}" y2="${n(yLine)}" ${line}/>`,
    tick(ox, yLine), tick(ox + drawW, yLine),
    `<text x="${n(ox + drawW / 2)}" y="${n(yLine - 1.2)}" font-size="3" text-anchor="middle" fill="#222">${Math.round(widthCm)}</text>`,
    `<line x1="${n(xLine)}" y1="${n(oy)}" x2="${n(xLine)}" y2="${n(oy + drawH)}" ${line}/>`,
    tick(xLine, oy), tick(xLine, oy + drawH),
    `<text x="${n(xLine + 1.2)}" y="${n(oy + drawH / 2)}" font-size="3" text-anchor="middle" fill="#222" transform="rotate(-90 ${n(xLine + 1.2)} ${n(oy + drawH / 2)})">${Math.round(heightCm)}</text>`,
  ].join('\n')
}

/** Razítko: nadpis, měřítko, datum, užitná plocha, měřítková úsečka a legenda kabelů. */
function titleBlockSvg(args: {
  rooms: Room[]; cables: Project['cables']; options: PlanSvgOptions; scale: number; pageWidth: number; pageHeight: number
}): string {
  const { rooms, cables, options, scale, pageWidth, pageHeight } = args
  const x = MARGIN, y = pageHeight - MARGIN - TITLE_HEIGHT, w = pageWidth - 2 * MARGIN
  const total = rooms.reduce((sum, r) => sum + polygonArea(r.pts), 0)

  // měřítková úsečka: 1 m, u hrubých měřítek 5 m
  const barCm = scale <= 100 ? 100 : 500
  const barMm = (barCm * 10) / scale
  const barX = x + w - barMm - 8, barY = y + 14

  const usedTypes = options.electro ? [...new Set(cables.map(c => c.type))] as CableType[] : []
  const legend = usedTypes.map((t, i) =>
    `<line x1="${n(x + 4 + i * 46)}" y1="${n(y + 18)}" x2="${n(x + 12 + i * 46)}" y2="${n(y + 18)}" stroke="${CABLE_TYPES[t].color}" stroke-width="0.6" stroke-dasharray="2 1"/>` +
    `<text x="${n(x + 14 + i * 46)}" y="${n(y + 19)}" font-size="2.4" fill="#333">${escapeXml(CABLE_TYPES[t].label.split(' (')[0])}</text>`).join('')

  return [
    `<rect x="${x}" y="${n(y)}" width="${w}" height="${TITLE_HEIGHT}" fill="none" stroke="#222" stroke-width="0.3"/>`,
    `<text x="${x + 4}" y="${n(y + 8)}" font-size="5" font-weight="bold" fill="#111">${escapeXml(options.title)}</text>`,
    `<text x="${x + 4}" y="${n(y + 13)}" font-size="3" fill="#333">Měřítko 1:${scale}   ·   Užitná plocha ${formatAreaM2(total)}   ·   ${escapeXml(options.date)}   ·   rozměry v cm</text>`,
    legend,
    `<line x1="${n(barX)}" y1="${n(barY)}" x2="${n(barX + barMm)}" y2="${n(barY)}" stroke="#222" stroke-width="0.5"/>`,
    `<line x1="${n(barX)}" y1="${n(barY - 1.5)}" x2="${n(barX)}" y2="${n(barY + 1.5)}" stroke="#222" stroke-width="0.4"/>`,
    `<line x1="${n(barX + barMm)}" y1="${n(barY - 1.5)}" x2="${n(barX + barMm)}" y2="${n(barY + 1.5)}" stroke="#222" stroke-width="0.4"/>`,
    `<text x="${n(barX + barMm / 2)}" y="${n(barY - 2.4)}" font-size="2.6" text-anchor="middle" fill="#222">${barCm / 100} m</text>`,
  ].join('\n')
}
