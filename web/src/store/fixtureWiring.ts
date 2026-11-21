// Přípojky vody a odpadu, které se přidají spolu s koupelnovým nábytkem (umyvadlo, sprchový kout).
import { FURNITURE_KINDS } from '../domain/furnitureCatalog'
import type { ElectricPoint, Furniture, FurnitureKind, Room } from '../domain/types'
import { clamp } from '../geometry/math'
import { nearestEdge, resolvePlacement } from '../geometry/placement'
import { edgeInfo } from '../geometry/polygon'
import type { WallModel } from '../geometry/walls'

interface Wiring {
  /** Studená a teplá voda: výška přípojek nad podlahou (cm) a jejich rozteč na zdi (cm). */
  taps: { height: number; spacing: number }
  /** Odpad: na zdi ve výšce `height`, nebo volně v podlaze pod nábytkem (sprchová vanička). */
  drain: { height: number; inFloor: boolean }
}

/** Co se přidá k jakému nábytku. Další koupelnové kusy (vana, pračka…) lze doplnit sem. */
export const FIXTURE_WIRING: Partial<Record<FurnitureKind, Wiring>> = {
  sink: { taps: { height: 55, spacing: 20 }, drain: { height: 50, inFloor: false } },
  shower: { taps: { height: 110, spacing: 15 }, drain: { height: 3, inFloor: true } },
}

/** Nejmenší odstup přípojky od rohu místnosti (cm). */
const CORNER_MARGIN = 5

/**
 * Body vodoinstalace pro nově přidaný nábytek: přípojka studené (SV) a teplé (TUV) vody na stěně za ním
 * (teplá vlevo při pohledu na zeď, studená vpravo) a odpad. Nábytek bez předpisu nemá nic.
 */
export function fixtureWiringPoints(
  furniture: Furniture, room: Room, walls: WallModel, newId: () => string,
): ElectricPoint[] {
  const wiring = FIXTURE_WIRING[furniture.kind]
  if (!wiring) return []
  const label = FURNITURE_KINDS[furniture.kind].label
  const center = resolvePlacement(furniture, room, walls)

  // zeď za nábytkem: ta, ke které je přichycený (zády), jinak nejbližší
  const sideways = (furniture.attach?.turn ?? 0) % 2 !== 0
  const edge = furniture.attach && !sideways ? furniture.attach.edge : nearestEdge(room.pts, center).edge
  const e = edgeInfo(room.pts, edge)
  const along = clamp((center.x - e.a.x) * e.dir.x + (center.y - e.a.y) * e.dir.y, CORNER_MARGIN, e.len - CORNER_MARGIN)

  // při pohledu na zeď zevnitř místnosti (osa y míří dolů) je vlevo vektor (fy, -fx), kde f míří ke zdi
  const left = { x: e.outward.y, y: -e.outward.x }
  const hotSide = Math.sign(e.dir.x * left.x + e.dir.y * left.y) || 1
  const link = (fixtureRole: NonNullable<ElectricPoint['fixtureRole']>) => ({ fixtureId: furniture.id, fixtureRole })
  const onWall = (name: string, role: NonNullable<ElectricPoint['fixtureRole']>, kind: ElectricPoint['kind'], at: number, height: number): ElectricPoint => ({
    id: newId(), roomId: room.id, kind, name, x: center.x, y: center.y, height, ...link(role),
    attach: { edge, along: clamp(at, CORNER_MARGIN, e.len - CORNER_MARGIN) },
  })

  const { taps, drain } = wiring
  const points = [
    onWall(`TUV ${label}`, 'hot', 'tap', along + (hotSide * taps.spacing) / 2, taps.height),
    onWall(`SV ${label}`, 'cold', 'tap', along - (hotSide * taps.spacing) / 2, taps.height),
  ]
  points.push(drain.inFloor
    // odpad v podlaze pod nábytkem stojí volně (nepřichytává se ke zdi)
    ? { id: newId(), roomId: room.id, kind: 'drain', name: `Odpad ${label}`, x: center.x, y: center.y, height: drain.height, snapToWalls: false, ...link('drain') }
    : onWall(`Odpad ${label}`, 'drain', 'drain', along, drain.height))
  return points
}

/**
 * Změny přípojek po přesunu, otočení nebo změně rozměru nábytku: každý bod nábytku dostane novou stěnu, polohu na ní
 * a místnost, jako by se nábytek přidal znovu. Výška, název a další ruční úpravy zůstávají. Klíčem je id bodu.
 */
export function fixtureRelinkPatches(
  furniture: Furniture, room: Room, walls: WallModel, points: ElectricPoint[],
): Map<string, Partial<ElectricPoint>> {
  const fresh = fixtureWiringPoints(furniture, room, walls, () => '')
  const patches = new Map<string, Partial<ElectricPoint>>()
  for (const point of points) {
    if (point.fixtureId !== furniture.id) continue
    const target = fresh.find(f => f.fixtureRole === point.fixtureRole)
    if (target) patches.set(point.id, { roomId: target.roomId, attach: target.attach, x: target.x, y: target.y })
  }
  return patches
}
