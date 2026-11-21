// Trasa potrubí po stěnách: nejkratší cesta kousek od zdí po obvodu místnosti, mezi místnostmi přes sdílenou zeď.
// Potrubí se v bytě netáhne středem místnosti, ale u zdí (v rýze, za lištou), proto se nehledá nejkratší přímá cesta.
import type { Pt, Room, Waypoint } from '../domain/types'
import { clamp } from './math'
import { edgeInfo } from './polygon'

/** O kolik cm od hotové stěny (do místnosti) potrubí vede. */
export const PIPE_WALL_OFFSET = 3
/** Nejvyšší vzdálenost (cm) dvou protilehlých stěn, které se pokládají za jednu sdílenou zeď (tloušťka + mezera). */
const SHARED_WALL_MAX_GAP = 60
/** Nejmenší společná délka stěn (cm), kudy lze potrubí protáhnout do sousední místnosti. */
const MIN_PASSAGE = 15
/** Odstup průchodu od konce společné stěny (cm), ať neleze do rohu. */
const PASSAGE_MARGIN = 8

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y

/** Obvod místnosti posunutý o `offset` dovnitř (rohy se zkosí podle úhlu stěn). */
export function insetPolygon(pts: Pt[], offset: number): Pt[] {
  return pts.map((p, i) => {
    const prev = edgeInfo(pts, (i - 1 + pts.length) % pts.length).inward
    const next = edgeInfo(pts, i).inward
    const k = offset / (1 + dot(prev, next))
    return { x: p.x + (prev.x + next.x) * k, y: p.y + (prev.y + next.y) * k }
  })
}

interface OnPerimeter { point: Pt; edge: number; /** vzdálenost po obvodu od prvního vrcholu */ s: number }

/** Nejbližší bod na obvodu mnohoúhelníku k bodu `p`. */
function nearestOnPerimeter(ring: Pt[], starts: number[], p: Pt): OnPerimeter {
  let best: OnPerimeter | null = null, bestDist = Infinity
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length]
    const dx = b.x - a.x, dy = b.y - a.y
    const len2 = dx * dx + dy * dy || 1
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1)
    const point = { x: a.x + dx * t, y: a.y + dy * t }
    const d = dist(p, point)
    if (d < bestDist) { bestDist = d; best = { point, edge: i, s: starts[i] + t * Math.sqrt(len2) } }
  })
  return best!
}

/**
 * Cesta po obvodu místnosti z bodu `from` do bodu `to` (v půdorysu). Vrátí body cesty od `from` po průmět `to`
 * (první a poslední je průmět na obvod, mezi nimi rohy). Jde kratším směrem kolem dokola.
 */
export function wallHug(room: Room, from: Pt, to: Pt, offset = PIPE_WALL_OFFSET): Pt[] {
  const ring = insetPolygon(room.pts, offset)
  const starts: number[] = []
  let total = 0
  ring.forEach((a, i) => { starts.push(total); total += dist(a, ring[(i + 1) % ring.length]) })

  const a = nearestOnPerimeter(ring, starts, from), b = nearestOnPerimeter(ring, starts, to)
  const mod = (v: number) => ((v % total) + total) % total
  const forward = mod(b.s - a.s)
  const backward = total - forward
  // rohy ležící mezi oběma body ve zvoleném směru, seřazené podle vzdálenosti od začátku
  const corners = (along: (k: number) => number, limit: number) =>
    ring.map((p, k) => ({ p, d: along(k) })).filter(c => c.d > 1e-6 && c.d < limit - 1e-6).sort((x, y) => x.d - y.d).map(c => c.p)
  const between = forward <= backward
    ? corners(k => mod(starts[k] - a.s), forward)
    : corners(k => mod(a.s - starts[k]), backward)
  return [a.point, ...between, b.point]
}

/** Průchod potrubí z místnosti `from` do sousední místnosti `to` přes sdílenou zeď. */
interface Passage { from: Room; to: Room; point: (target: Pt) => { exit: Pt; entry: Pt } }

/** Všechny průchody z místnosti `a` do místnosti `b` (každá dvojice protilehlých stěn s dostatečným přesahem je jeden). */
function passages(a: Room, b: Room, offset: number): Passage[] {
  const result: Passage[] = []
  a.pts.forEach((_, i) => {
    const e1 = edgeInfo(a.pts, i)
    b.pts.forEach((__, j) => {
      const e2 = edgeInfo(b.pts, j)
      if (dot(e1.dir, e2.dir) > -0.99) return                       // stěny nejsou protilehlé
      const gap = dot({ x: e2.a.x - e1.a.x, y: e2.a.y - e1.a.y }, e1.outward)
      if (gap < -1 || gap > SHARED_WALL_MAX_GAP) return            // druhá stěna neleží za první
      const t2a = dot({ x: e2.a.x - e1.a.x, y: e2.a.y - e1.a.y }, e1.dir)
      const t2b = dot({ x: e2.b.x - e1.a.x, y: e2.b.y - e1.a.y }, e1.dir)
      const lo = Math.max(0, Math.min(t2a, t2b)), hi = Math.min(e1.len, Math.max(t2a, t2b))
      if (hi - lo < MIN_PASSAGE) return
      result.push({
        from: a, to: b,
        // průchod co nejblíž cíli, ale ne v rohu
        point: target => {
          const along = clamp(dot({ x: target.x - e1.a.x, y: target.y - e1.a.y }, e1.dir), lo + PASSAGE_MARGIN, hi - PASSAGE_MARGIN)
          const base = { x: e1.a.x + e1.dir.x * along, y: e1.a.y + e1.dir.y * along }
          return {
            exit: { x: base.x + e1.inward.x * offset, y: base.y + e1.inward.y * offset },
            entry: { x: base.x + e1.outward.x * (gap + offset), y: base.y + e1.outward.y * (gap + offset) },
          }
        },
      })
    })
  })
  return result
}

/** Nejkratší posloupnost sousedních místností (nejméně průchodů); null, když se tam nedá projít. */
function roomPath(rooms: Room[], start: Room, goal: Room, offset: number): Room[] | null {
  const previous = new Map<string, Room | null>([[start.id, null]])
  const queue = [start]
  while (queue.length > 0) {
    const room = queue.shift()!
    if (room.id === goal.id) break
    for (const next of rooms) {
      if (previous.has(next.id) || passages(room, next, offset).length === 0) continue
      previous.set(next.id, room)
      queue.push(next)
    }
  }
  if (!previous.has(goal.id)) return null
  const path: Room[] = []
  for (let r: Room | null = goal; r; r = previous.get(r.id) ?? null) path.unshift(r)
  return path
}

/** Odstraní body, které splývají s předchozím, a body ležící na přímce mezi sousedními. */
function simplify(points: Waypoint[]): Waypoint[] {
  const same = (a: Waypoint, b: Waypoint) => Math.abs(a.x - b.x) < 0.05 && Math.abs(a.y - b.y) < 0.05 && Math.abs(a.z - b.z) < 0.05
  const unique = points.filter((p, i) => i === 0 || !same(p, points[i - 1]))
  return unique.filter((p, i) => {
    if (i === 0 || i === unique.length - 1) return true
    const a = unique[i - 1], b = unique[i + 1]
    const cross = (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x)
    return Math.abs(cross) > 0.01 || Math.abs((p.z - a.z)) > 0.05 || Math.abs((b.z - p.z)) > 0.05
  })
}

/**
 * Trasa potrubí z `from` do `to` po stěnách: z bodu svisle do výšky vedení `runZ`, odtud kolmo ke zdi, po zdi
 * (kratším směrem) a přes sdílené zdi do dalších místností, nakonec svisle k cílovému bodu. Vrací mezilehlé body
 * (bez koncových); null, když mezi místnostmi není průchod (pak se hodí běžná trasa).
 */
export function wallPipeRoute(
  from: Waypoint, to: Waypoint, fromRoom: Room, toRoom: Room, runZ: number, rooms: Room[], offset = PIPE_WALL_OFFSET,
): Waypoint[] | null {
  const path = fromRoom.id === toRoom.id ? [fromRoom] : roomPath(rooms, fromRoom, toRoom, offset)
  if (!path) return null

  const at = (p: Pt): Waypoint => ({ x: p.x, y: p.y, z: runZ })
  const route: Waypoint[] = [at(from)]
  let current: Pt = from
  path.forEach((room, i) => {
    const next = path[i + 1]
    if (next) {
      // z této místnosti vedeme k nejbližšímu průchodu do další a pokračujeme z jejího druhého konce
      const options = passages(room, next, offset).map(p => p.point(to))
      const best = options.sort((p, q) => dist(current, p.exit) + dist(p.entry, to) - dist(current, q.exit) - dist(q.entry, to))[0]
      wallHug(room, current, best.exit, offset).forEach(p => route.push(at(p)))
      route.push(at(best.exit), at(best.entry))
      current = best.entry
    } else {
      wallHug(room, current, to, offset).forEach(p => route.push(at(p)))
    }
  })
  route.push(at(to))

  // vynecháme body splývající s koncovými body (potrubí začíná a končí svisle)
  const middle = simplify(route)
  const sameXY = (a: Waypoint, b: Waypoint) => Math.abs(a.x - b.x) < 0.05 && Math.abs(a.y - b.y) < 0.05
  return middle.filter((p, i) => !(i === 0 && sameXY(p, from) && p.z === from.z) && !(i === middle.length - 1 && sameXY(p, to) && p.z === to.z))
}
