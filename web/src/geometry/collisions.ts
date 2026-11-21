// Kontrola rozmístění nábytku: co přesahuje do zdi, překrývá se s jiným nábytkem nebo radiátorem,
// trčí nad strop nebo blokuje otevírání dveří. Nic se nezakazuje, jen se na to upozorní.
import { OBSTACLE_KINDS } from '../domain/catalog'
import { FURNITURE_KINDS } from '../domain/furnitureCatalog'
import type { Furniture, Obstacle, Placed, Pt, Room } from '../domain/types'
import { ceilingLevel } from './ceiling'
import { resolvePlacement, wallThicknessFor } from './placement'
import { containsPoint } from './polygon'
import type { WallModel } from './walls'

export type IssueKind = 'outside' | 'too-tall' | 'overlap' | 'blocks-door'

export interface FurnitureIssue {
  furnitureId: string
  kind: IssueKind
  /** Čitelný popis problému pro uživatele. */
  message: string
}

/** Dotyk hranou není kolize: obdélníky se před testem o tolik cm zmenší. */
const TOUCH_TOLERANCE = 0.5

/** Čtyři rohy obdélníku se středem `c`, natočeného o `rot` (šířka podél osy x, hloubka podél osy y). */
export function orientedRect(c: Pt, rot: number, w: number, d: number): Pt[] {
  const u = { x: Math.cos(rot), y: Math.sin(rot) }
  const v = { x: -Math.sin(rot), y: Math.cos(rot) }
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([a, b]) => ({
    x: c.x + (u.x * a * w) / 2 + (v.x * b * d) / 2,
    y: c.y + (u.y * a * w) / 2 + (v.y * b * d) / 2,
  }))
}

/** Překrývají se dva konvexní mnohoúhelníky? (věta o dělicí ose) */
export function polygonsOverlap(a: Pt[], b: Pt[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length]
      const axis = { x: q.y - p.y, y: p.x - q.x }
      const project = (pts: Pt[]) => {
        const values = pts.map(pt => pt.x * axis.x + pt.y * axis.y)
        return [Math.min(...values), Math.max(...values)]
      }
      const [aMin, aMax] = project(a), [bMin, bMax] = project(b)
      if (aMax <= bMin || bMax <= aMin) return false   // osa, na které se nepřekrývají
    }
  }
  return true
}

const heightsOverlap = (a: Placed, b: Placed) => a.elev < b.elev + b.h && b.elev < a.elev + a.h

interface Footprint<T extends Placed> { item: T; room: Room; rect: Pt[] }

function footprintOf<T extends Placed>(item: T, rooms: Room[], walls: WallModel, inWall = false): Footprint<T> | null {
  const room = rooms.find(r => r.id === item.roomId)
  if (!room) return null
  const p = resolvePlacement(item, room, walls, inWall)
  const rect = orientedRect(p, p.rot, Math.max(1, item.w - 2 * TOUCH_TOLERANCE), Math.max(1, item.d - 2 * TOUCH_TOLERANCE))
  return { item, room, rect }
}

export function findFurnitureIssues(
  project: { rooms: Room[]; obstacles: Obstacle[]; furniture: Furniture[] },
  walls: WallModel,
): FurnitureIssue[] {
  const { rooms, obstacles, furniture } = project
  const issues: FurnitureIssue[] = []
  const add = (furnitureId: string, kind: IssueKind, message: string) => issues.push({ furnitureId, kind, message })

  const items = furniture.flatMap(f => footprintOf(f, rooms, walls) ?? [])

  // volný prostor dveří a otvorů (průchodů): čtverec šířka dveří × šířka dveří před nimi, uvnitř místnosti
  const doorClearances = obstacles
    .filter(o => o.kind === 'door' || o.kind === 'opening')
    .flatMap(door => {
      const room = rooms.find(r => r.id === door.roomId)
      if (!room || !door.attach) return []
      const p = resolvePlacement(door, room, walls, true)
      const forward = { x: -Math.sin(p.rot), y: Math.cos(p.rot) }   // směr do místnosti
      const reach = wallThicknessFor(door, room, walls) / 2 + door.w / 2
      const center = { x: p.x + forward.x * reach, y: p.y + forward.y * reach }
      return [{ door, rect: orientedRect(center, p.rot, door.w - 2 * TOUCH_TOLERANCE, door.w - 2 * TOUCH_TOLERANCE) }]
    })

  items.forEach(({ item: f, room, rect }, i) => {
    if (!rect.every(corner => containsPoint(room.pts, corner))) add(f.id, 'outside', 'Přesahuje mimo místnost (do zdi)')
    if (f.elev + f.h > ceilingLevel(room) + 0.5) add(f.id, 'too-tall', 'Je vyšší než strop')

    for (const other of items.slice(i + 1)) {
      if (heightsOverlap(f, other.item) && polygonsOverlap(rect, other.rect)) {
        add(f.id, 'overlap', `Překrývá se s: ${FURNITURE_KINDS[other.item.kind].label}`)
        add(other.item.id, 'overlap', `Překrývá se s: ${FURNITURE_KINDS[f.kind].label}`)
      }
    }

    for (const o of obstacles) {
      if (OBSTACLE_KINDS[o.kind].inWall || !heightsOverlap(f, o)) continue   // okna a dveře leží ve zdi
      const footprint = footprintOf(o, rooms, walls)
      if (footprint && polygonsOverlap(rect, footprint.rect)) add(f.id, 'overlap', `Překrývá se s: ${OBSTACLE_KINDS[o.kind].label}`)
    }

    for (const { door, rect: clearance } of doorClearances) {
      if (door.roomId === f.roomId && f.elev < door.elev + door.h && polygonsOverlap(rect, clearance)) {
        add(f.id, 'blocks-door', door.kind === 'door' ? 'Blokuje otevírání dveří' : 'Blokuje průchod otvorem')
      }
    }
  })

  return issues
}
