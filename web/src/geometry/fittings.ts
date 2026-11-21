// Tvarovky potrubí: kolena podle ohybů trasy, T-kusy podle styku trubek v bodě a trubky k nákupu.
import type { Cable, PipeType } from '../domain/types'
import type { Pos3 } from './electric'

/** Od jakého úhlu ohybu (stupně) se trasa pokládá za zalomenou; menší odchylky jsou jen nepřesnost. */
const MIN_BEND_DEG = 5
/** Od jakého úhlu ohybu se použije koleno 90°, menší ohyby jsou kolena 45°. */
const ELBOW_90_FROM_DEG = 67.5

/** Délka jedné trubky při nákupu (cm): PPR se prodává po 4 m, kanalizační HT po 2 a 3 m. */
export const PIPE_STICK_LENGTH: Record<PipeType, number> = {
  'pipe-cold': 400, 'pipe-hot': 400, 'pipe-drain-50': 200, 'pipe-drain-110': 300,
}

export interface Elbows { elbow90: number; elbow45: number }

/** Kolik kolen 90° a 45° potřebuje jedna trasa (od bodu přes mezilehlé body k bodu), ohyby se počítají ve 3D. */
export function countElbows(polyline: Pos3[]): Elbows {
  const result: Elbows = { elbow90: 0, elbow45: 0 }
  for (let i = 1; i + 1 < polyline.length; i++) {
    const a = polyline[i - 1], b = polyline[i], c = polyline[i + 1]
    const d1 = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, d2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z }
    const l1 = Math.hypot(d1.x, d1.y, d1.z), l2 = Math.hypot(d2.x, d2.y, d2.z)
    if (l1 < 0.01 || l2 < 0.01) continue                           // splývající body nejsou ohyb
    const cos = (d1.x * d2.x + d1.y * d2.y + d1.z * d2.z) / (l1 * l2)
    const bend = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
    if (bend < MIN_BEND_DEG) continue
    if (bend >= ELBOW_90_FROM_DEG) result.elbow90++
    else result.elbow45++
  }
  return result
}

/**
 * Kolik T-kusů potřebuje potrubí jednoho typu: v bodě, kde se stýkají aspoň tři trubky, je jich o dvě méně
 * (dvě trubky jsou průchozí, každá další je odbočka).
 */
export function countTees(cables: Pick<Cable, 'fromId' | 'toId'>[]): number {
  const incident = new Map<string, number>()
  for (const c of cables) for (const id of [c.fromId, c.toId]) incident.set(id, (incident.get(id) ?? 0) + 1)
  let tees = 0
  for (const count of incident.values()) if (count >= 3) tees += count - 2
  return tees
}

/** Kolik trubek koupit: délka s rezervou zaokrouhlená nahoru na celé kusy. */
export const sticksToBuy = (type: PipeType, lengthCm: number, reserve: number) =>
  Math.ceil((lengthCm * reserve) / PIPE_STICK_LENGTH[type])
