// Elektro: poloha bodů, trasy kabelů, jejich automatické trasování a délka.
import { BOARD_DEFAULT_SIZE, ELECTRIC_KINDS } from '../domain/electricCatalog'
import type { Cable, CableType, ElectricKind, ElectricPoint, Pt, Room, Waypoint } from '../domain/types'
import { ceilingLevel } from './ceiling'
import { clamp, snap } from './math'
import { frontRotation, nearestEdge, roomAt } from './placement'
import { containsPoint, edgeInfo } from './polygon'

/** Bod v prostoru: x, y v půdorysu, z = výška nad podlahou (cm). */
export type Pos3 = Waypoint

export interface ElectricPosition extends Pos3 {
  /** Natočení (rad): u nástěnných bodů lokální osa +y míří do místnosti. */
  rot: number
}

/** O kolik cm od rohu místnosti musí nástěnný bod stát. */
const CORNER_MARGIN = 5
/** Svislá trasa u vedení pod stropem: kolik cm pod stropem se vede (u SDK nad deskou, v podhledu). */
const RUN_BELOW_SLAB = 30
const RUN_ABOVE_SDK_BOARD = 3

/** Rozměry rozvaděče (šířka × výška × hloubka, cm); chybějící hodnoty se doplní výchozími. */
export function boardSize(point: Pick<ElectricPoint, 'w' | 'h' | 'd'>): { w: number; h: number; d: number } {
  return { w: point.w ?? BOARD_DEFAULT_SIZE.w, h: point.h ?? BOARD_DEFAULT_SIZE.h, d: point.d ?? BOARD_DEFAULT_SIZE.d }
}

/** Jak daleko od konce zdi musí nástěnný bod stát (rozvaděč tak, aby se celý vešel). */
export function wallMargin(point: ElectricPoint): number {
  return point.kind === 'board' ? Math.max(CORNER_MARGIN, boardSize(point).w / 2) : CORNER_MARGIN
}

/**
 * Poloha bodu pro kabely a měření: x, y v půdorysu a z. U zásuvek a vypínačů je z jejich střed (zadaná výška),
 * u rozvaděče jeho HORNÍ hrana (zadaná výška je spodní hrana + výška skříně) - tam kabely vstupují.
 */
export function electricPosition(point: ElectricPoint, room: Room): ElectricPosition {
  const spec = ELECTRIC_KINDS[point.kind]
  if (spec.mount === 'ceiling') return { x: point.x, y: point.y, z: ceilingLevel(room), rot: 0 }
  const z = point.kind === 'board' ? point.height + boardSize(point).h : point.height
  if (!point.attach || point.attach.edge >= room.pts.length) return { x: point.x, y: point.y, z, rot: 0 }

  const e = edgeInfo(room.pts, point.attach.edge)
  const margin = wallMargin(point)
  const along = clamp(point.attach.along, margin, e.len - margin)
  return { x: e.a.x + e.dir.x * along, y: e.a.y + e.dir.y * along, z, rot: frontRotation(e) }
}

/** Změna bodu při tažení: nástěnné se přichytí ke stěně místnosti pod kurzorem, stropní stojí kde je kurzor. */
export function dragElectricPatch(point: ElectricPoint, rooms: Room[], cursor: Pt): Partial<ElectricPoint> {
  const room = roomAt(rooms, cursor) ?? rooms.find(r => r.id === point.roomId)
  if (!room) return {}
  if (ELECTRIC_KINDS[point.kind].mount === 'ceiling') {
    return { roomId: room.id, x: snap(cursor.x), y: snap(cursor.y) }
  }
  const near = nearestEdge(room.pts, cursor)
  return { roomId: room.id, attach: { edge: near.edge, along: snap(near.along) } }
}

/** Celá trasa kabelu včetně koncových bodů; null, když některý konec chybí. */
export function cablePolyline(cable: Cable, points: ElectricPoint[], rooms: Room[]): Pos3[] | null {
  const position = (id: string) => {
    const point = points.find(p => p.id === id)
    const room = point && rooms.find(r => r.id === point.roomId)
    return point && room ? electricPosition(point, room) : null
  }
  const from = position(cable.fromId), to = position(cable.toId)
  if (!from || !to) return null
  return [from, ...cable.via, to]
}

export function polylineLength(polyline: Pos3[]): number {
  let length = 0
  for (let i = 0; i + 1 < polyline.length; i++) {
    const a = polyline[i], b = polyline[i + 1]
    length += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
  }
  return length
}

/** Výška vedení kabelů pod stropem: u SDK podhledu v dutině nad deskou, jinak 30 cm pod stropem. */
export function runHeight(...rooms: (Room | undefined)[]): number {
  const heights = rooms.filter((r): r is Room => !!r).map(r =>
    r.ceiling.type === 'sdk' ? ceilingLevel(r) + RUN_ABOVE_SDK_BOARD : r.height - RUN_BELOW_SLAB)
  return heights.length ? Math.min(...heights) : 230
}

/**
 * Automatická trasa: z bodu svisle (ve zdi / ze stropu) do výšky vedení, pak vodorovně v pravých úhlech
 * (kolénko volíme tak, aby leželo uvnitř bytu) a svisle dolů ke koncovému bodu.
 */
export function autoRoute(from: Pos3, to: Pos3, runZ: number, rooms: Room[]): Waypoint[] {
  const route: Waypoint[] = [{ x: from.x, y: from.y, z: runZ }]
  if (from.x !== to.x && from.y !== to.y) {
    const inside = (p: Pt) => rooms.some(r => containsPoint(r.pts, p))
    const first = { x: to.x, y: from.y }, second = { x: from.x, y: to.y }
    const elbow = inside(first) || !inside(second) ? first : second
    route.push({ ...elbow, z: runZ })
  }
  route.push({ x: to.x, y: to.y, z: runZ })

  // vynecháme body, které splývají s předchozím nebo s koncem trasy (např. světlo přímo ve výšce vedení)
  const sameAs = (a: Pos3, b: Pos3) => a.x === b.x && a.y === b.y && a.z === b.z
  return route.filter((p, i) => !sameAs(p, i === 0 ? from : route[i - 1]) && !(i === route.length - 1 && sameAs(p, to)))
}

// ---- automatické napojení ----

/** Spojení navržené automatickým napojením. */
export interface PlannedCable {
  fromId: string
  toId: string
  type: CableType
  circuit: string
}

/** Role skupiny při napojování: vypínač, světlo, zásuvka. */
type WiringRole = 'switch' | 'light' | 'socket'

const WIRING_GROUPS: { role: WiringRole; kinds: ElectricKind[]; type: CableType; label: string }[] = [
  { role: 'switch', kinds: ['switch'], type: 'cyky-3x1.5', label: 'Osvětlení' },
  { role: 'light', kinds: ['light'], type: 'cyky-3x1.5', label: 'Světla' },
  { role: 'socket', kinds: ['socket', 'socket-double'], type: 'cyky-3x2.5', label: 'Zásuvky' },
]

/** Penalizace vzdálenosti za spojení mezi různými místnostmi: napojuje se přednostně v rámci místnosti (cm). */
const OTHER_ROOM_PENALTY = 1000

/**
 * Navrhne kabely pro body, které zatím žádný kabel nemají (hotové kabely se nemění). Je-li zadáno `only`, napojí
 * se jen tyto body (třeba právě přidaná zásuvka); ostatní se nezkoumají a nic se jim nemění:
 *  - **vypínače** na rozvaděč (každý přímo; bez rozvaděče se řetězí mezi sebou),
 *  - **světla** na nejbližší vypínač (každé přímo a okruh přebírá od vypínače; bez vypínačů viz zásuvky),
 *  - **zásuvky** vždy primárně k rozvaděči, ale po místnostech: v každé místnosti se nejbližší zásuvka napojí
 *    přímo k rozvaděči a ostatní se řetězí na nejbližší nově napojenou zásuvku TÉŽE místnosti (zásuvky různých
 *    místností se nikdy nespojují mezi sebou). Jako cíl slouží i už hotové zásuvky téže místnosti, ale jen ty,
 *    které mají kabel stejného typu (okruh sporáku 5×4 se tak nepoužije). Když je místnost už napojená na rozvaděč,
 *    nová zásuvka se řetězí na její zásuvky. Bez rozvaděče se začne od první zásuvky místnosti.
 * Každý kabel vedoucí přímo z rozvaděče začíná nový okruh; ostatní převezmou okruh bodu, na který se napojují.
 * Napojuje se přednostně v rámci téže místnosti.
 */
export function planAutoConnections(
  project: { rooms: Room[]; electric: ElectricPoint[]; cables: Cable[] },
  only?: string[],
): PlannedCable[] {
  const { rooms, electric, cables } = project
  const planned: PlannedCable[] = []
  const usedCircuits = new Set(cables.map(c => c.circuit))
  const circuitOf = new Map<string, string>()
  for (const c of cables) { circuitOf.set(c.fromId, c.circuit); circuitOf.set(c.toId, c.circuit) }

  const position = (p: ElectricPoint) => {
    const room = rooms.find(r => r.id === p.roomId)
    return room ? electricPosition(p, room) : { x: p.x, y: p.y, z: 0, rot: 0 }
  }
  // vzdálenost po pravoúhlé trase (kabely vedou v pravých úhlech); jiná místnost je "dál"
  const distance = (a: ElectricPoint, b: ElectricPoint) => {
    const pa = position(a), pb = position(b)
    return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) + (a.roomId === b.roomId ? 0 : OTHER_ROOM_PENALTY)
  }
  const uniqueCircuit = (label: string) => {
    let name = label
    for (let n = 2; usedCircuits.has(name); n++) name = `${label} ${n}`
    usedCircuits.add(name)
    return name
  }
  const hasCable = (p: ElectricPoint) => cables.some(c => c.fromId === p.id || c.toId === p.id)

  const boards = electric.filter(p => p.kind === 'board')
  const switches = electric.filter(p => p.kind === 'switch')

  for (const group of WIRING_GROUPS) {
    const points = electric.filter(p => group.kinds.includes(p.kind))
    const pending = points.filter(p => !hasCable(p) && (!only || only.includes(p.id)))
    if (pending.length === 0) continue

    // kam se napojuje a smí se řetězit mezi body skupiny?
    let targets: ElectricPoint[]
    let chain: boolean
    if (group.role === 'switch') { targets = boards; chain = boards.length === 0 }
    else if (group.role === 'light' && switches.length > 0) { targets = switches; chain = false }
    else { targets = boards; chain = true }

    // Rozvaděč má přednost: když existuje, síť začíná jen jím a nové body se k němu řetězí. Už hotové kabely
    // (třeba okruh sporáku) se nepoužijí jako místo, kam se napojuje. Bez rozvaděče se napojuje na hotové body skupiny.
    // hotové body skupiny, na které lze navázat: mají kabel typu této skupiny (okruh sporáku 5x4 mezi zásuvky nepatří)
    const wired = points.filter(p => cables.some(c => c.type === group.type && (c.fromId === p.id || c.toId === p.id)))
    const network = [...targets, ...(chain ? wired : [])]

    // Při řetězení platí: body se spojují jen v rámci jedné místnosti a k rozvaděči se v každé místnosti napojí
    // přímo jen její nejbližší bod (ostatní se řetězí na body téže místnosti).
    const boardIds = new Set(boards.map(b => b.id))
    const roomsLinkedToBoard = new Set<string>(
      wired.filter(p => cables.some(c => c.type === group.type && ((c.fromId === p.id && boardIds.has(c.toId)) || (c.toId === p.id && boardIds.has(c.fromId))))).map(p => p.roomId),
    )
    const allowed = (p: ElectricPoint, q: ElectricPoint) =>
      !chain || (q.kind === 'board' ? !roomsLinkedToBoard.has(p.roomId) : q.roomId === p.roomId)

    while (pending.length > 0) {
      let best: { p: ElectricPoint; q: ElectricPoint; d: number } | null = null
      for (const p of pending) for (const q of network) {
        if (!allowed(p, q)) continue
        const d = distance(p, q)
        if (!best || d < best.d) best = { p, q, d }
      }
      if (!best) {                        // není na co napojit (bez rozvaděče nikdo v místnosti napojený není): začneme tímto bodem
        if (!chain) break
        network.push(pending.shift()!)
        continue
      }
      const { p, q } = best
      // z rozvaděče začíná vždy nový okruh; od vypínače nebo bodu se okruh přebírá
      const circuit = q.kind === 'board' ? uniqueCircuit(group.label) : (circuitOf.get(q.id) ?? uniqueCircuit(group.label))
      planned.push({ fromId: q.id, toId: p.id, type: group.type, circuit })
      circuitOf.set(p.id, circuit)
      if (q.kind !== 'board') circuitOf.set(q.id, circuit)
      else if (chain) roomsLinkedToBoard.add(p.roomId)
      if (chain) network.push(p)
      pending.splice(pending.indexOf(p), 1)
    }
  }
  return planned
}
