// Otevírání dveří: kde je závěs, kam se křídlo otevírá a jak vypadá jeho oblouk.
// Souřadnice jsou lokální souřadnice dveří: počátek uprostřed zdi, osa x podél zdi, osa y (+) do místnosti.
import type { Obstacle, Pt } from '../domain/types'

export interface DoorSwing {
  hinge: Pt
  /** Konec zavřeného křídla (protější špaleta, než je závěs). */
  closedEnd: Pt
  /** Konec otevřeného křídla (kolmo ke zdi). */
  openEnd: Pt
  radius: number
  /** SVG příznak směru oblouku z `closedEnd` do `openEnd`. */
  sweep: 0 | 1
}

/**
 * Geometrie otevírání dveří. Levé dveře mají závěs vlevo při pohledu z místnosti na dveře.
 * Otevírají-li se ven, křídlo i oblouk leží na druhé straně zdi.
 */
export function doorSwing(door: Pick<Obstacle, 'w' | 'hinge' | 'swing'>, wallThickness: number): DoorSwing {
  const hingeX = (door.hinge === 'right' ? 1 : -1) * (door.w / 2)
  const direction = door.swing === 'out' ? -1 : 1                // +1 do místnosti, -1 ven
  const faceY = direction * (wallThickness / 2)                   // líc zdi na straně, kam se otevírá
  const hinge = { x: hingeX, y: faceY }
  const closedEnd = { x: -hingeX, y: faceY }
  const openEnd = { x: hingeX, y: faceY + direction * door.w }
  const cross = (closedEnd.x - hinge.x) * (openEnd.y - hinge.y) - (closedEnd.y - hinge.y) * (openEnd.x - hinge.x)
  return { hinge, closedEnd, openEnd, radius: door.w, sweep: cross > 0 ? 1 : 0 }
}

/** Výseč (kruhová čtvrtina), kterou dveře při otevírání zametou, jako SVG cesta. */
export function swingSectorPath(s: DoorSwing): string {
  const f = (v: number) => Math.round(v * 100) / 100
  return `M${f(s.hinge.x)} ${f(s.hinge.y)}L${f(s.closedEnd.x)} ${f(s.closedEnd.y)}` +
    `A${f(s.radius)} ${f(s.radius)} 0 0 ${s.sweep} ${f(s.openEnd.x)} ${f(s.openEnd.y)}Z`
}

/** Body obvodu výseče (pro 3D stín na podlaze): závěs, pak oblouk od zavřeného po otevřené křídlo. */
export function swingSectorPoints(s: DoorSwing, steps = 16): Pt[] {
  const start = Math.atan2(s.closedEnd.y - s.hinge.y, s.closedEnd.x - s.hinge.x)
  const turn = (s.sweep === 1 ? 1 : -1) * (Math.PI / 2)
  const points: Pt[] = [s.hinge]
  for (let i = 0; i <= steps; i++) {
    const a = start + (turn * i) / steps
    points.push({ x: s.hinge.x + s.radius * Math.cos(a), y: s.hinge.y + s.radius * Math.sin(a) })
  }
  return points
}
