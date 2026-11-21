// Tisknutelný půdorys jako SVG ve skutečném měřítku na papíře A4 (jednotky stránky jsou milimetry).
// Čistá funkce bez prohlížeče, takže jde testovat; samotné otevření tisku je v printPlan.ts.
import { CABLE_TYPES, ELECTRIC_KINDS, systemOfLine, systemOfPoint, type System } from '../domain/electricCatalog'
import { FURNITURE_KINDS } from '../domain/furnitureCatalog'
import { OBSTACLE_KINDS } from '../domain/catalog'
import { floorColor } from '../domain/finishes'
import type { CableType, PlumbingKind, Project, Pt, Room } from '../domain/types'
import { formatAreaM2 } from '../format'
import { doorSwing } from '../geometry/doors'
import { boardSize, cablePolyline, electricPosition } from '../geometry/electric'
import { resolvePlacement, wallThicknessFor } from '../geometry/placement'
import { bbox, centroid, edgeInfo, polygonArea } from '../geometry/polygon'
import { buildWallModel, outerPolygon, wallQuad, type WallModel } from '../geometry/walls'
import { buildSummaryPages } from './summarySvg'

/** Co se na stránce kreslí. Zdi, otvory a podlahy jsou na každé stránce. */
export interface PageLayers {
  /** Názvy a plochy místností. */
  roomNames: boolean
  /** Kóty: délky u jednotlivých stěn. */
  wallDimensions: boolean
  /** Kóty: celkové vnější rozměry bytu. */
  overallDimensions: boolean
  /** Nábytek: žádný, jen slabé obrysy (pro orientaci), nebo plný s názvy. */
  furniture: 'none' | 'faint' | 'full'
  /** Elektro body a kabely (a legenda kabelů v razítku). */
  electro: boolean
  /** Body vodoinstalace a potrubí (a legenda potrubí v razítku). */
  plumbing: boolean
}

export interface PlanSvgOptions {
  layers: PageLayers
  /** Nadpis v razítku. */
  title: string
  /** Datum v razítku (kvůli testům se předává zvenku). */
  date: string
}

/** Stránky tisku s výkresem: každá ukazuje jednu věc samostatně. */
export type DrawingPageKind = 'plan' | 'equipment' | 'electro' | 'plumbing'
/** Všechny stránky tisku: výkresy a na konci soupis (tabulky, ne výkres). */
export type PageKind = DrawingPageKind | 'summary'

export const PAGES: Record<DrawingPageKind, { title: string; layers: PageLayers }> = {
  plan: {
    title: 'Půdorys',
    layers: { roomNames: true, wallDimensions: true, overallDimensions: true, furniture: 'none', electro: false, plumbing: false },
  },
  equipment: {
    title: 'Vybavení',
    layers: { roomNames: false, wallDimensions: false, overallDimensions: false, furniture: 'full', electro: false, plumbing: false },
  },
  electro: {
    title: 'Elektro',
    layers: { roomNames: true, wallDimensions: false, overallDimensions: false, furniture: 'faint', electro: true, plumbing: false },
  },
  plumbing: {
    title: 'Vodoinstalace',
    layers: { roomNames: true, wallDimensions: false, overallDimensions: false, furniture: 'faint', electro: false, plumbing: true },
  },
}

/** Název stránky v nabídce tisku. */
export const pageTitle = (kind: PageKind) => (kind === 'summary' ? 'Soupis' : PAGES[kind].title)

export interface PlanSvg {
  /** Která stránka to je (je-li z `buildPlanPages`). */
  kind?: PageKind

  svg: string
  /** Rozměry stránky v mm (A4 na výšku nebo na šířku podle tvaru bytu). */
  pageWidth: number
  pageHeight: number
  /** Jmenovatel měřítka (1:`scale`). */
  scale: number
}

const MARGIN = 8           // okraj stránky (mm)
const TITLE_HEIGHT = 20    // výška razítka (mm)
const DIM_SPACE = 12       // místo pro vnější kóty (mm)
/** Měřítko se zaokrouhluje nahoru na násobky tohoto čísla (1:30, 1:35, 1:40 …). */
const SCALE_STEP = 5

/**
 * Nejdetailnější měřítko (násobek 5), ve kterém se rozměry (cm) vejdou do plochy (mm). Výkres tak vyplní
 * stránku co nejvíc; standardní stupně (1:50, 1:100) by u většiny bytů nechaly půlku stránky prázdnou.
 */
export function pickScale(widthCm: number, heightCm: number, areaWidthMm: number, areaHeightMm: number): number {
  const needed = Math.max((widthCm * 10) / areaWidthMm, (heightCm * 10) / areaHeightMm)
  return Math.max(SCALE_STEP * 2, Math.ceil(needed / SCALE_STEP) * SCALE_STEP)
}

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const n = (v: number) => String(Math.round(v * 100) / 100)
const ring = (pts: Pt[]) => `M${pts.map(p => `${n(p.x)} ${n(p.y)}`).join('L')}Z`

export function buildPlanSvg(project: Project, options: PlanSvgOptions): PlanSvg {
  const { rooms, obstacles, furniture, cables } = project
  const { layers } = options
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
  // místo pro vnější kóty se vyhrazuje vždy, ať mají všechny stránky stejné měřítko a výkres je na nich na stejném místě
  const dimSpace = DIM_SPACE
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
    fixturesSvg(rooms, obstacles, walls, mm),
    layers.furniture !== 'none' ? furnitureSvg(rooms, furniture, walls, mm, layers.furniture === 'full') : '',
    layers.electro ? installationSvg(project, mm, 'electro') : '',
    layers.plumbing ? installationSvg(project, mm, 'plumbing') : '',
    layers.roomNames ? labelsSvg(rooms, mm) : '',
    layers.wallDimensions ? edgeDimensionsSvg(rooms, s, mm) : '',
  ].join('\n')

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}mm" height="${pageHeight}mm" viewBox="0 0 ${pageWidth} ${pageHeight}" font-family="Arial, Helvetica, sans-serif">`,
    `<rect width="${pageWidth}" height="${pageHeight}" fill="#fff"/>`,
    `<g transform="translate(${n(ox - box.minX * s)} ${n(oy - box.minY * s)}) scale(${Math.round(s * 1e5) / 1e5})">`,
    body,
    `</g>`,
    layers.overallDimensions ? overallDimensionsSvg(ox, oy, drawW, drawH, widthCm, heightCm) : '',
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
    `<path d="${ring(r.pts)}" fill="${floorColor(r)}" fill-opacity="0.45"/>`).join('\n')
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

/** Stoupačky, topení a pevné body (kruh / obdélník): obrys v barvě prvku. */
function fixturesSvg(rooms: Room[], obstacles: Project['obstacles'], walls: WallModel, mm: (v: number) => number): string {
  return obstacles.flatMap(o => {
    const spec = OBSTACLE_KINDS[o.kind]
    const room = rooms.find(r => r.id === o.roomId)
    if (!room || spec.inWall) return []                                  // okna a dveře kreslí openingsSvg
    const p = resolvePlacement(o, room, walls)
    const look = `fill="${spec.color}" stroke="#222" stroke-width="${n(mm(0.25))}"`
    const shape = spec.round
      ? `<ellipse cx="0" cy="0" rx="${n(o.w / 2)}" ry="${n(o.d / 2)}" ${look}/>`
      : `<rect x="${n(-o.w / 2)}" y="${n(-o.d / 2)}" width="${n(o.w)}" height="${n(o.d)}" ${look}/>`
    return [`<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n((p.rot * 180) / Math.PI)})">${shape}</g>`]
  }).join('\n')
}

function furnitureSvg(
  rooms: Room[], furniture: Project['furniture'], walls: WallModel, mm: (v: number) => number, full: boolean,
): string {
  return furniture.flatMap(f => {
    const room = rooms.find(r => r.id === f.roomId)
    if (!room) return []
    const p = resolvePlacement(f, room, walls)
    const label = FURNITURE_KINDS[f.kind].label
    const fits = full && Math.min(f.w, f.d) > mm(11)       // názvy jen na plné stránce a tam, kam se vejdou
    const look = full
      ? `fill="#fff" fill-opacity="0.6" stroke="#666" stroke-width="${n(mm(0.18))}"`
      : `fill="none" stroke="#aaa" stroke-width="${n(mm(0.12))}"`   // slabý obrys pro orientaci
    return [
      `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n((p.rot * 180) / Math.PI)})">` +
      `<rect x="${n(-f.w / 2)}" y="${n(-f.d / 2)}" width="${n(f.w)}" height="${n(f.d)}" ${look}/></g>` +
      (fits ? `<text x="${n(p.x)}" y="${n(p.y)}" font-size="${n(mm(2.4))}" fill="#555" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>` : ''),
    ]
  }).join('\n')
}

/** Značky bodů vodoinstalace v tisku: výplň a písmeno uvnitř. */
const PLUMBING_SYMBOL: Record<PlumbingKind, { fill: string; text: string }> = {
  'water-main': { fill: '#cfe3fb', text: 'V' }, boiler: { fill: '#f9d3cf', text: 'B' }, tap: { fill: '#cfe3fb', text: 'T' },
  drain: { fill: '#dcdcdc', text: 'O' }, 'drain-wc': { fill: '#dcdcdc', text: 'WC' }, sewer: { fill: '#bfc2c7', text: 'S' },
}

/** Body a vedení jednoho instalačního systému: elektro (kabely, zásuvky…) nebo vodoinstalace (potrubí, výtoky…). */
function installationSvg(project: Project, mm: (v: number) => number, system: System): string {
  const { rooms } = project
  const electric = project.electric.filter(p => systemOfPoint(p.kind) === system)
  const cables = project.cables.filter(c => systemOfLine(c.type) === system)
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
    const plumbingSymbol = PLUMBING_SYMBOL[point.kind as PlumbingKind]
    const shape =
      plumbingSymbol ? `<circle cx="0" cy="${n(r)}" r="${n(r)}" fill="${plumbingSymbol.fill}" ${stroke}/>` +
        `<text x="0" y="${n(r)}" font-size="${n(r * (point.kind === 'drain-wc' ? 1 : 1.3))}" text-anchor="middle" dominant-baseline="central" fill="#222">${plumbingSymbol.text}</text>`
      : point.kind === 'socket' ? `<circle cx="0" cy="${n(r)}" r="${n(r)}" fill="#fff" ${stroke}/>`
      : point.kind === 'socket-double' ? `<circle cx="${n(-r)}" cy="${n(r)}" r="${n(r)}" fill="#fff" ${stroke}/><circle cx="${n(r)}" cy="${n(r)}" r="${n(r)}" fill="#fff" ${stroke}/>`
      : point.kind === 'switch' ? `<circle cx="0" cy="${n(r)}" r="${n(r * 0.8)}" fill="#fff" ${stroke}/><line x1="0" y1="${n(r)}" x2="${n(r)}" y2="${n(r * 1.9)}" ${stroke}/>`
      : point.kind === 'light' ? `<circle r="${n(r)}" fill="#fff" ${stroke}/><path d="M${n(-r * 0.7)} ${n(-r * 0.7)}L${n(r * 0.7)} ${n(r * 0.7)}M${n(-r * 0.7)} ${n(r * 0.7)}L${n(r * 0.7)} ${n(-r * 0.7)}" fill="none" ${stroke}/>`
      : (() => {
        // rozvaděč: skutečný půdorys skříně (šířka × hloubka), nejméně jako čitelná značka
        const b = boardSize(point)
        return `<rect x="${n(-b.w / 2)}" y="0" width="${n(b.w)}" height="${n(Math.max(b.d, mm(1.6)))}" fill="#fff" ${stroke}/>`
      })()
    return [`<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n((p.rot * 180) / Math.PI)})">${shape}</g>`]
  })
  return [...lines, ...symbols].join('\n')
}

/** Název a plocha místnosti u těžiště. */
function labelsSvg(rooms: Room[], mm: (v: number) => number): string {
  return rooms.map(r => {
    const c = centroid(r.pts)
    return `<text x="${n(c.x)}" y="${n(c.y)}" text-anchor="middle" fill="#222">` +
      `<tspan font-size="${n(mm(3.8))}" font-weight="bold">${escapeXml(r.name)}</tspan>` +
      `<tspan x="${n(c.x)}" dy="${n(mm(4))}" font-size="${n(mm(3))}" fill="#555">${formatAreaM2(polygonArea(r.pts))}</tspan></text>`
  }).join('\n')
}

/** Světlé délky stěn (cm) uvnitř místností u každé stěny; svislé stěny mají text otočený podél zdi. */
function edgeDimensionsSvg(rooms: Room[], s: number, mm: (v: number) => number): string {
  const size = 2.5
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

  // legenda vedení: jen typy systému, který stránka ukazuje
  const shown = (type: CableType) => (options.layers.electro && systemOfLine(type) === 'electro') || (options.layers.plumbing && systemOfLine(type) === 'plumbing')
  const usedTypes = [...new Set(cables.map(c => c.type))].filter(shown)
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

// ---- víc stránek ----

/**
 * Které stránky mají co ukázat: půdorys vždy, vybavení jen s nábytkem, elektro a vodoinstalace jen s jejich body,
 * soupis na konci, když je co soupisovat (elektro, voda nebo SDK podhled).
 */
export function availablePages(project: Pick<Project, 'furniture' | 'electric' | 'cables'> & { rooms?: Room[] }): PageKind[] {
  const pages: PageKind[] = ['plan']
  const has = (system: System) =>
    project.electric.some(p => systemOfPoint(p.kind) === system) || project.cables.some(c => systemOfLine(c.type) === system)
  if (project.furniture.length > 0) pages.push('equipment')
  if (has('electro')) pages.push('electro')
  if (has('plumbing')) pages.push('plumbing')
  if (has('electro') || has('plumbing') || (project.rooms ?? []).some(r => r.ceiling.type === 'sdk')) pages.push('summary')
  return pages
}

/**
 * Samostatné stránky výkresu (půdorys / vybavení / elektro). Všechny mají stejné měřítko a výkres
 * na stejném místě, takže jdou přiložit přes sebe proti světlu.
 */
export function buildPlanPages(project: Project, base: { title: string; date: string }, kinds: PageKind[]): PlanSvg[] {
  const drawing = (kind: DrawingPageKind): PlanSvg => ({
    ...buildPlanSvg(project, { layers: PAGES[kind].layers, title: `${base.title} - ${PAGES[kind].title}`, date: base.date }),
    kind,
  })
  return kinds.flatMap(kind => {
    if (kind !== 'summary') return [drawing(kind)]
    // soupis má stejný list jako výkresy (formát se řídí tvarem bytu)
    const { pageWidth, pageHeight } = buildPlanSvg(project, { layers: PAGES.plan.layers, title: '', date: base.date })
    return buildSummaryPages(project, base, pageWidth, pageHeight).map((page): PlanSvg => ({ ...page, scale: 0, kind }))
  })
}
