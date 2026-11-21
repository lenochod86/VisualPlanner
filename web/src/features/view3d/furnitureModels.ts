// 3D vzhled nábytku: každý kus je pár jednoduchých těles (kvádrů a válců).
// Rozměry těles jsou ZLOMKY rozměrů kusu (0-1), takže se model sám přepočítá, když uživatel změní šířku/hloubku/výšku.
//   x: 0 = levý okraj, 1 = pravý     y: 0 = spodek, 1 = vršek     z: 0 = záda u zdi, 1 = přední strana
import type { FurnitureKind } from '../../domain/types'

type Range = [number, number]

export interface ModelPart {
  /** Válec: 'cyl' stojí svisle (průměr určuje x a z), 'cylz' leží podélně od zdi do místnosti (průměr určuje x a y; kulaté okénko pračky), 'sphere' je koule / elipsoid vepsaný do rozsahů. */
  shape: 'box' | 'cyl' | 'cylz' | 'sphere'
  x: Range
  y: Range
  z: Range
  color: string
  opacity?: number
  /** Válec zúžený nahoru: poloměr horní podstavy jako zlomek dolní (kužel lampy). */
  taper?: number
  /** Svítí (lampa): barva se přidá i jako vlastní záře. */
  glow?: boolean
}

const box = (x: Range, y: Range, z: Range, color: string, opacity?: number): ModelPart => ({ shape: 'box', x, y, z, color, opacity })
const cyl = (x: Range, y: Range, z: Range, color: string): ModelPart => ({ shape: 'cyl', x, y, z, color })
const sphere = (x: Range, y: Range, z: Range, color: string): ModelPart => ({ shape: 'sphere', x, y, z, color })
const cone = (x: Range, y: Range, z: Range, color: string, taper: number, glow = false): ModelPart => ({ shape: 'cyl', x, y, z, color, taper, glow })
const cylZ = (x: Range, y: Range, z: Range, color: string): ModelPart => ({ shape: 'cylz', x, y, z, color })

/** Čtyři nohy v rozích: `x`/`z` jsou rozsahy levé zadní nohy, ostatní jsou zrcadlově. */
const legs = (x: Range, z: Range, y: Range, color: string): ModelPart[] =>
  [x, [1 - x[1], 1 - x[0]] as Range].flatMap(xs =>
    [z, [1 - z[1], 1 - z[0]] as Range].map(zs => box(xs, y, zs, color)))


/** Rozsah o středu `c` a poloviční velikosti `r`, ořezaný na 0-1 (list nesmí přesáhnout rozměr kusu). */
const around = (c: number, r: number): Range => [Math.max(0, c - r), Math.min(1, c + r)]

/**
 * Pokojová rostlina: květináč s okrajem a zeminou, několik stonků a kolem nich věnec listů (zploštělé elipsoidy)
 * ve čtyřech odstínech zelené. Listy se rozmístí deterministicky (zlatý úhel), takže model vypadá pokaždé stejně.
 */
function houseplant(opts: { pot: string; potTop: number; leaves: number; leafSize: number; crownBottom: number; aspect: number }): ModelPart[] {
  const { pot, potTop, leaves, leafSize, crownBottom, aspect } = opts
  // zlomky výšky jsou vůči šířce natažené (`aspect` = šířka / výška kusu): list je tak vysoký jen asi poloviny své šířky
  const leafY = leafSize * 0.5 * aspect
  const parts: ModelPart[] = [
    cyl([0.22, 0.78], [0, potTop * 0.85], [0.22, 0.78], pot),                    // tělo květináče
    cyl([0.18, 0.82], [potTop * 0.85, potTop], [0.18, 0.82], pot),               // okraj
    cyl([0.23, 0.77], [potTop * 0.96, potTop * 1.02], [0.23, 0.77], '#4a3626'),  // zemina
  ]
  const greens = ['#2f7a3e', '#3f9250', '#4fa85a', '#68bb6c']
  // stonky z květináče do koruny
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4, r = 0.1 + (i % 2) * 0.05
    const cx = 0.5 + Math.cos(a) * r, cz = 0.5 + Math.sin(a) * r
    parts.push(cyl(around(cx, 0.012), [potTop, crownBottom + 0.12 + (i % 3) * 0.08], around(cz, 0.012), '#5d7f3f'))
  }
  // listy: s výškou se věnec zužuje
  for (let i = 0; i < leaves; i++) {
    const t = i / (leaves - 1)
    const a = i * 2.39996                                                     // zlatý úhel
    const radius = 0.38 * (1 - t * 0.75)
    const cx = 0.5 + Math.cos(a) * radius, cz = 0.5 + Math.sin(a) * radius
    const cy = crownBottom + t * (0.93 - crownBottom)
    const size = leafSize * (1 - t * 0.3)
    parts.push(sphere(around(cx, size), around(cy, leafY), around(cz, size), greens[i % greens.length]))
  }
  parts.push(sphere(around(0.5, leafSize * 0.8), around(0.93, leafY), around(0.5, leafSize * 0.8), greens[3]))   // vršek
  return parts
}

/** Police na zdi: deska, čelo, konzoly pod deskou a drobnosti navrchu. */
function shelf(): ModelPart[] {
  const wood = '#c9a883', dark = '#a98763'
  return [
    box([0, 1], [0.1, 0.17], [0, 1], wood),                       // deska
    box([0, 1], [0.1, 0.17], [0.94, 1], dark),                    // čelo
    box([0.1, 0.14], [0, 0.1], [0, 0.85], '#8d8f93'),             // levá konzola
    box([0.86, 0.9], [0, 0.1], [0, 0.85], '#8d8f93'),             // pravá konzola
    box([0.06, 0.2], [0.17, 0.78], [0.2, 0.7], '#b5513f'),        // knihy
    box([0.2, 0.26], [0.17, 0.7], [0.2, 0.7], '#3f6fb5'),
    box([0.26, 0.33], [0.17, 0.85], [0.2, 0.7], '#d9b64a'),
    cyl([0.55, 0.7], [0.17, 0.45], [0.3, 0.65], '#e8e4da'),       // váza
    cyl([0.615, 0.625], [0.45, 0.95], [0.46, 0.5], '#5d7f3f'),    // větvička
    sphere([0.58, 0.67], [0.8, 0.95], [0.4, 0.58], '#4fa85a'),
    cyl([0.82, 0.92], [0.17, 0.4], [0.35, 0.65], '#d9d4c7'),      // svíčka
    cone([0.855, 0.885], [0.4, 0.5], [0.47, 0.53], '#f2b84a', 0.2, true),
  ]
}

/** Kuchyňská linka se sporákem (vlevo) a dřezem (vpravo); ostatní skříňky jsou jen dvířka a zásuvky. */
function kitchenUnit(): ModelPart[] {
  const chrome = '#c9ced3', dark = '#2a2d31'
  const parts: ModelPart[] = [
    box([0, 1], [0, 0.08], [0.05, 0.95], '#2f2f2f'),                    // sokl
    box([0, 1], [0.08, 0.95], [0, 0.99], '#e8e4dc'),                    // skříňky
    box([0, 1], [0.95, 1], [0, 1], '#4a4a4a'),                          // pracovní deska
  ]
  // spáry mezi dvířky
  for (const x of [0.1, 0.35, 0.475, 0.6, 0.75, 0.9]) parts.push(box([x - 0.002, x + 0.002], [0.1, 0.93], [0.985, 1], '#9a958b'))
  // sporák: trouba s okénkem a madlem, ovladače
  parts.push(
    box([0.105, 0.345], [0.12, 0.8], [0.985, 0.998], dark),             // dvířka trouby
    box([0.125, 0.325], [0.2, 0.66], [0.99, 1], '#0e1114'),             // sklo trouby
    box([0.13, 0.32], [0.715, 0.735], [0.99, 1], chrome),               // madlo
    box([0.105, 0.345], [0.82, 0.93], [0.985, 0.998], dark),            // ovládací panel
  )
  for (const x of [0.135, 0.185, 0.235, 0.285]) parts.push(cylZ([x - 0.0075, x + 0.0075], [0.845, 0.884], [0.99, 1], chrome))   // ovladače
  // varná deska: černé sklo a čtyři hořáky (kruhy 14 cm)
  parts.push(box([0.1, 0.35], [1, 1.01], [0.12, 0.88], '#15171a'))
  for (const x of [0.1625, 0.2875]) for (const z of [0.32, 0.68]) {
    parts.push(cyl([x - 0.03, x + 0.03], [1.01, 1.02], [z - 0.12, z + 0.12], '#555b61'))
    parts.push(cyl([x - 0.018, x + 0.018], [1.02, 1.026], [z - 0.072, z + 0.072], '#26292c'))
  }
  // zásuvky uprostřed
  for (const y of [0.52, 0.8]) parts.push(box([0.38, 0.57], [y, y + 0.015], [0.985, 1], chrome))
  // dřez: nerezová deska, jedna hluboká miska, kapací plocha s drážkami, odtok
  parts.push(
    box([0.58, 0.92], [1, 1.006], [0.08, 0.92], chrome),
    box([0.6, 0.72], [1.006, 1.012], [0.18, 0.82], '#7f868d'),          // miska
    cyl([0.645, 0.665], [1.012, 1.016], [0.46, 0.54], '#3a3d42'),       // odtok
  )
  for (const x of [0.78, 0.81, 0.84, 0.87]) parts.push(box([x, x + 0.004], [1.006, 1.011], [0.15, 0.85], '#8e959c'))   // drážky kapací plochy
  // baterie nad dřezem: sloupek, výtok, výtok dolů a páčka
  parts.push(
    cyl([0.64, 0.657], [1.006, 1.2], [0.04, 0.107], chrome),
    cylZ([0.642, 0.655], [1.167, 1.2], [0.06, 0.3], chrome),
    cyl([0.64, 0.657], [1.12, 1.2], [0.27, 0.33], chrome),
    box([0.66, 0.69], [1.1, 1.13], [0.05, 0.09], chrome),
  )
  return parts
}

/** Regál: zadní stěna, dva boky, police a řada knih na každé polici. */
function bookcase(): ModelPart[] {
  const parts: ModelPart[] = [
    box([0, 1], [0, 0.03], [0, 1], '#8a6f4f'),                       // sokl
    box([0, 1], [0, 1], [0, 0.05], '#a98763'),                       // záda
    box([0, 0.04], [0, 1], [0, 1], '#c9a883'),                        // levý bok
    box([0.96, 1], [0, 1], [0, 1], '#c9a883'),                        // pravý bok
  ]
  const bookColors = ['#b5513f', '#3f6fb5', '#d9b64a', '#4a8f5a', '#7a4fa0', '#d97a3a']
  for (let i = 0; i < 5; i++) {                                         // 5 polic, na čtyřech knihy
    const y0 = i * 0.2
    parts.push(box([0.04, 0.96], [y0, y0 + 0.02], [0, 1], '#c9a883'))
    if (i === 4) continue
    let x = 0.07
    bookColors.forEach((color, n) => {
      const w = 0.07 + ((n + i) % 3) * 0.015
      parts.push(box([x, x + w], [y0 + 0.02, y0 + 0.17 - ((n + i) % 2) * 0.03], [0.1, 0.85], color))
      x += w + 0.005
    })
  }
  parts.push(box([0.04, 0.96], [0.98, 1], [0, 1], '#c9a883'))             // vrchní deska
  return parts
}

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

  // kuchyňská linka (240 × 60 × 90 cm): vlevo sporák (varná deska se čtyřmi hořáky, dole trouba s okénkem a madlem,
  // nad ní ovladače), uprostřed zásuvky, vpravo dřez s kapací plochou a baterií. Baterie a hořáky trčí nad desku.
  'kitchen-unit': kitchenUnit(),

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

  // sprchový kout (90 × 90 × 200 cm, zády k zadní a levé zdi): vanička s odtokem, sklo v rámu, nástěnná baterie
  // se dvěma ovladači, tropický déšť (talíř 40 cm na rameni) a ruční sprcha na držáku
  shower: [
    box([0, 1], [0, 0.04], [0, 1], '#e6e6e6'),                          // vanička
    cyl([0.47, 0.53], [0.04, 0.043], [0.47, 0.53], '#8d8f93'),          // odtok
    box([0.985, 1], [0.04, 1], [0, 1], '#9fd3ee', 0.25),                // sklo vpravo
    box([0, 1], [0.04, 1], [0.985, 1], '#9fd3ee', 0.25),                // sklo vpředu
    box([0.985, 1], [0.04, 1], [0.985, 1], '#c9ced3'),                  // rám: svislý profil v rohu
    box([0, 1], [0.985, 1], [0.985, 1], '#c9ced3'),                     // rám: horní profil vpředu
    box([0.985, 1], [0.985, 1], [0, 1], '#c9ced3'),                     // rám: horní profil vpravo
    box([0.32, 0.68], [0.51, 0.57], [0, 0.025], '#c9ced3'),             // baterie: deska na zdi
    cylZ([0.385, 0.455], [0.525, 0.555], [0.025, 0.085], '#b8bec6'),    // baterie: levý ovladač
    cylZ([0.545, 0.615], [0.525, 0.555], [0.025, 0.085], '#b8bec6'),    // baterie: pravý ovladač
    cylZ([0.485, 0.515], [0.9825, 0.996], [0, 0.5], '#c9ced3'),         // rameno dešťové sprchy
    cyl([0.28, 0.72], [0.955, 0.97], [0.28, 0.72], '#c9ced3'),          // tropický déšť: talíř
    cyl([0.3, 0.7], [0.952, 0.955], [0.3, 0.7], '#7c828a'),             // tropický déšť: trysky
    box([0.74, 0.8], [0.64, 0.68], [0, 0.04], '#c9ced3'),               // držák ruční sprchy
    cyl([0.75, 0.79], [0.55, 0.68], [0.012, 0.052], '#b8bec6'),         // ruční sprcha
  ],

  bathtub: [
    box([0, 1], [0, 1], [0, 1], '#f4f4f4'),
    box([0.05, 0.95], [0.85, 1.004], [0.1, 0.9], '#cfe6f2'),    // vnitřek vany
  ],

  // umyvadlo na zdi: keramika, mísa s odtokem a stojánková baterie s výtokem a páčkou (trčí nad hranu)
  sink: [
    box([0, 1], [0, 0.7], [0, 1], '#fafafa'),
    box([0.1, 0.9], [0.695, 0.705], [0.12, 0.88], '#d7e6ee'),           // mísa
    cyl([0.467, 0.533], [0.7, 0.71], [0.505, 0.595], '#8d8f93'),        // odtok
    cyl([0.46, 0.54], [0.7, 1.15], [0.04, 0.14], '#c9ced3'),            // baterie: sloupek
    cylZ([0.48, 0.52], [1.0, 1.125], [0.05, 0.3], '#c9ced3'),           // baterie: výtok
    cyl([0.48, 0.52], [0.9, 1.125], [0.27, 0.33], '#c9ced3'),           // baterie: konec výtoku
    box([0.54, 0.66], [1.04, 1.08], [0.07, 0.1], '#b8bec6'),            // baterie: páčka
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

  // nástěnná police: deska s čelem, dvě konzoly a drobnosti navrchu (knihy, váza s větvičkou, svíčka)
  shelf: shelf(),

  // regál: zadní stěna, boky, police a barevné knihy
  bookcase: bookcase(),

  // květina: menší květináč, nízká hustá koruna
  'plant-small': houseplant({ pot: '#b5654a', potTop: 0.3, leaves: 16, leafSize: 0.2, crownBottom: 0.38, aspect: 25 / 60 }),

  // velká rostlina: nižší šedý květináč a vyšší koruna s větším počtem listů
  'plant-large': houseplant({ pot: '#8a8f94', potTop: 0.2, leaves: 40, leafSize: 0.2, crownBottom: 0.3, aspect: 45 / 160 }),

  // stojací lampa: kruhová podstava, tenká noha s mosazným prstencem a látkové stínidlo se světlem uvnitř
  'floor-lamp': [
    cyl([0.1, 0.9], [0, 0.012], [0.1, 0.9], '#3a3d42'),
    cyl([0.46, 0.54], [0.012, 0.78], [0.46, 0.54], '#3a3d42'),
    cyl([0.44, 0.56], [0.4, 0.42], [0.44, 0.56], '#b8964a'),
    cyl([0.3, 0.7], [0.76, 0.79], [0.3, 0.7], '#b8964a'),
    cone([0.05, 0.95], [0.78, 0.97], [0.05, 0.95], '#f1e4bd', 0.62, true),
    cyl([0.46, 0.54], [0.97, 0.985], [0.46, 0.54], '#b8964a'),
  ],

  // stolní lampička: kulatý keramický podstavec, krk a široké stínidlo
  'table-lamp': [
    cyl([0.2, 0.8], [0, 0.04], [0.2, 0.8], '#3a3d42'),
    sphere([0.25, 0.75], [0.03, 0.5], [0.25, 0.75], '#5b86a6'),
    cyl([0.44, 0.56], [0.45, 0.65], [0.44, 0.56], '#b8964a'),
    cone([0.05, 0.95], [0.6, 0.98], [0.05, 0.95], '#f1e4bd', 0.6, true),
  ],

}
