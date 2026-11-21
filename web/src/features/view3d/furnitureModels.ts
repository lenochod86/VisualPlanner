// 3D vzhled nábytku: každý kus je pár jednoduchých těles (kvádrů a válců).
// Rozměry těles jsou ZLOMKY rozměrů kusu (0-1), takže se model sám přepočítá, když uživatel změní šířku/hloubku/výšku.
//   x: 0 = levý okraj, 1 = pravý     y: 0 = spodek, 1 = vršek     z: 0 = záda u zdi, 1 = přední strana
import type { FurnitureKind } from '../../domain/types'

type Range = [number, number]

export interface ModelPart {
  /** Válec: 'cyl' stojí svisle (průměr určuje x a z), 'cylz' leží podélně od zdi do místnosti (průměr určuje x a y; kulaté okénko pračky). */
  shape: 'box' | 'cyl' | 'cylz'
  x: Range
  y: Range
  z: Range
  color: string
  opacity?: number
}

const box = (x: Range, y: Range, z: Range, color: string, opacity?: number): ModelPart => ({ shape: 'box', x, y, z, color, opacity })
const cyl = (x: Range, y: Range, z: Range, color: string): ModelPart => ({ shape: 'cyl', x, y, z, color })
const cylZ = (x: Range, y: Range, z: Range, color: string): ModelPart => ({ shape: 'cylz', x, y, z, color })

/** Čtyři nohy v rozích: `x`/`z` jsou rozsahy levé zadní nohy, ostatní jsou zrcadlově. */
const legs = (x: Range, z: Range, y: Range, color: string): ModelPart[] =>
  [x, [1 - x[1], 1 - x[0]] as Range].flatMap(xs =>
    [z, [1 - z[1], 1 - z[0]] as Range].map(zs => box(xs, y, zs, color)))

const bed = (pillows: Range[]): ModelPart[] => [
  box([0, 1], [0, 0.3], [0, 1], '#8b6b4a'),               // rám
  box([0.02, 0.98], [0.3, 0.56], [0.03, 1], '#f2f0ea'),   // matrace
  box([0, 1], [0, 1], [0, 0.03], '#8b6b4a'),              // čelo
  ...pillows.map(x => box(x, [0.56, 0.63], [0.06, 0.22], '#ffffff')),
]

export const FURNITURE_MODELS: Record<FurnitureKind, ModelPart[]> = {
  'bed-single': bed([[0.12, 0.88]]),
  'bed-double': bed([[0.07, 0.47], [0.53, 0.93]]),

  sofa: [
    box([0, 1], [0, 0.3], [0, 1], '#5c6f8a'),             // podstava
    box([0.1, 0.9], [0.3, 0.5], [0.28, 1], '#6b80a0'),    // sedák
    box([0.1, 0.9], [0.3, 1], [0, 0.28], '#5c6f8a'),      // opěradlo
    box([0, 0.1], [0.3, 0.72], [0, 1], '#5c6f8a'),        // područky
    box([0.9, 1], [0.3, 0.72], [0, 1], '#5c6f8a'),
  ],

  table: [
    box([0, 1], [0.94, 1], [0, 1], '#b08968'),
    ...legs([0.02, 0.06], [0.04, 0.11], [0, 0.94], '#8a6a4a'),
  ],

  chair: [
    box([0, 1], [0.46, 0.52], [0, 1], '#b08968'),         // sedák
    box([0, 1], [0.52, 1], [0, 0.1], '#b08968'),          // opěradlo
    ...legs([0.05, 0.15], [0.05, 0.15], [0, 0.46], '#8a6a4a'),
  ],

  tv: [box([0, 1], [0, 1], [0, 1], '#15171a')],

  wardrobe: [
    box([0, 1], [0, 1], [0, 1], '#cdbb9f'),
    box([0.495, 0.505], [0.02, 0.98], [0.985, 1.001], '#6b5a44'),   // spára mezi dveřmi
  ],

  'kitchen-unit': [
    box([0, 1], [0, 0.08], [0.05, 0.95], '#2f2f2f'),      // sokl
    box([0, 1], [0.08, 0.95], [0, 1], '#e8e4dc'),         // skříňky
    box([0, 1], [0.95, 1], [0, 1], '#4a4a4a'),            // pracovní deska
    box([0.1, 0.35], [0.95, 1.004], [0.15, 0.85], '#1e1e1e'),   // varná deska
    box([0.6, 0.85], [0.95, 1.004], [0.15, 0.85], '#c3c7cb'),   // dřez
  ],

  'wc-free': [
    cyl([0.05, 0.95], [0, 0.5], [0.32, 1], '#ffffff'),    // mísa
    cyl([0.05, 0.95], [0.5, 0.54], [0.32, 1], '#f0f0f0'), // prkénko
    box([0.1, 0.9], [0.3, 1], [0, 0.3], '#ffffff'),       // nádržka
  ],

  'wc-wall': [
    box([0, 1], [0, 0.95], [0, 0.2], '#e9e9e9'),                // předstěna s Geberit modulem
    box([0.35, 0.65], [0.62, 0.8], [0.2, 0.215], '#b8bec6'),    // ovládací tlačítko
    cyl([0.1, 0.9], [0.1, 0.34], [0.22, 1], '#ffffff'),         // závěsná mísa
    cyl([0.1, 0.9], [0.34, 0.37], [0.22, 1], '#f0f0f0'),        // prkénko
  ],

  shower: [
    box([0, 1], [0, 0.05], [0, 1], '#e6e6e6'),                  // vanička
    box([0.985, 1], [0.05, 1], [0, 1], '#9fd3ee', 0.25),        // sklo vpravo
    box([0, 1], [0.05, 1], [0.985, 1], '#9fd3ee', 0.25),        // sklo vpředu
    cyl([0.05, 0.09], [0.4, 1], [0.03, 0.07], '#b8bec6'),       // sprchová tyč
  ],

  bathtub: [
    box([0, 1], [0, 1], [0, 1], '#f4f4f4'),
    box([0.05, 0.95], [0.85, 1.004], [0.1, 0.9], '#cfe6f2'),    // vnitřek vany
  ],

  sink: [
    box([0, 1], [0, 0.7], [0, 1], '#fafafa'),
    box([0.1, 0.9], [0.65, 0.705], [0.12, 0.88], '#d7e6ee'),    // mísa
    cyl([0.46, 0.54], [0.7, 1], [0.04, 0.12], '#b8bec6'),       // baterie
  ],

  // pračka a sušička: bílá skříň, kulaté okénko na čelní straně (průměr 38 / 28 cm při výchozích rozměrech)
  washer: [
    box([0, 1], [0, 1], [0, 1], '#f4f6f8'),
    box([0.05, 0.95], [0.88, 0.97], [0.99, 1.003], '#d7dde3'),            // ovládací panel
    box([0.08, 0.4], [0.9, 0.95], [0.995, 1.004], '#c9d0d6'),             // zásuvka na prášek
    cylZ([0.183, 0.817], [0.2265, 0.6735], [0.985, 1.004], '#c9d0d6'),    // rám okénka
    cylZ([0.267, 0.733], [0.2855, 0.6145], [0.99, 1.006], '#3b4a5a'),     // sklo
  ],
  dryer: [
    box([0, 1], [0, 1], [0, 1], '#eef1f4'),
    box([0.05, 0.95], [0.88, 0.97], [0.99, 1.003], '#d7dde3'),            // ovládací panel
    cylZ([0.8, 0.9], [0.86, 0.93], [0.995, 1.006], '#8a939b'),            // volič programů
    cylZ([0.183, 0.817], [0.2265, 0.6735], [0.985, 1.004], '#c9d0d6'),    // rám okénka
    cylZ([0.267, 0.733], [0.2855, 0.6145], [0.99, 1.006], '#4a5868'),     // sklo
  ],

  // lednice s mrazákem dole: dvoje dveře, madla vlevo
  fridge: [
    box([0.03, 0.97], [0, 0.02], [0.05, 0.95], '#444444'),                // sokl
    box([0, 1], [0.02, 1], [0, 1], '#e8ecef'),
    box([0, 1], [0.355, 0.36], [0.99, 1.003], '#9aa3ab'),                 // spára mezi mrazákem a chladničkou
    box([0.07, 0.11], [0.43, 0.62], [1, 1.025], '#b8bec6'),               // madlo chladničky
    box([0.07, 0.11], [0.2, 0.31], [1, 1.025], '#b8bec6'),                // madlo mrazáku
  ],

  // digestoř s komínem: nízká nasávací část dole (se světly na spodní straně), komín nahoru ke stropu
  hood: [
    box([0, 1], [0.012, 0.2], [0, 1], '#c3c8cd'),                  // nasávací část
    box([0.06, 0.94], [0, 0.012], [0.08, 0.92], '#2b2f33'),        // spodní strana s filtrem
    box([0.3, 0.7], [0.2, 1], [0, 0.55], '#b4bac0'),               // komín
  ],
}
