// Datový model projektu. Půdorys: x doprava, y dolů (v 3D odpovídá y souřadnici z). Jednotky: cm.

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'toilet' | 'hall' | 'other'
export type RoomShape = 'rect' | 'L-left' | 'L-right'
export type WallMaterial = 'plaster' | 'brick' | 'concrete' | 'tile' | 'sdk'
/** Zobrazení stěny: automaticky (skrytá, když leží uvnitř jiné místnosti), vždy plná, nebo skrytá (průhledná). */
export type WallMode = 'auto' | 'solid' | 'hidden'
/** Materiál podlahy (barva se dá přebít vlastní). */
export type FloorMaterial = 'parquet' | 'laminate' | 'vinyl' | 'tile' | 'carpet' | 'concrete'

export interface Floor {
  material: FloorMaterial
  /** Vlastní barva podlahy; bez ní platí barva materiálu. */
  color?: string
}

export type CeilingType = 'none' | 'slab' | 'sdk'

export interface Ceiling {
  type: CeilingType
  /** SDK podhled: o kolik cm visí pod stropem (stropem je výška místnosti). */
  drop: number
  /** SDK podhled: rozteč nosných profilů (podél osy x) a příčných (podél osy y), v cm. */
  profileSpacing: number
  crossSpacing: number
}

export interface Room {
  id: string
  name: string
  type: RoomType
  /** Rektilineární polygon = vnitřní líc stěn. Stěny se kreslí směrem ven. */
  pts: Pt[]
  /** Tloušťka zdi u každé stěny (stejné pořadí jako `pts`). Sdílená zeď má tloušťku danou mezerou mezi místnostmi, viz geometry/walls.ts. */
  walls: number[]
  height: number
  /** Materiál zdi u každé stěny (stejné pořadí jako `pts`); u sdílené zdi platí pro polovinu na straně této místnosti. */
  wallMaterials: WallMaterial[]
  /** Režim zobrazení u každé stěny (stejné pořadí jako `pts`). */
  wallModes: WallMode[]
  /** Povrch podlahy; bez něj se podlaha kreslí barvou podle typu místnosti. */
  floor?: Floor
  /** Vlastní barva každé stěny (stejné pořadí jako `pts`); null / chybí = barva materiálu stěny. */
  wallColors?: (string | null)[]
  /** Do jaké výšky sahá obklad u stěn s materiálem "obklad" (cm); chybí = výchozí. Nad ním je omítka. */
  tileHeight?: number
  ceiling: Ceiling
}

/**
 * Cokoli, co se pokládá do místnosti jako kvádr: překážky i nábytek.
 * Lokální osy: x = šířka (podél zdi), y = hloubka (0 vzadu u zdi, + směrem do místnosti).
 */
export interface Placed {
  id: string
  roomId: string
  w: number          // šířka podél zdi
  d: number          // hloubka od zdi
  h: number
  elev: number       // výška spodní hrany nad podlahou
  /** Volná poloha a natočení (rad); platí jen když věc není připnutá ke stěně. */
  x: number
  y: number
  rot: number
  /** Připnutí ke stěně: věc sleduje stěnu při změně rozměrů místnosti. */
  attach?: { edge: number; along: number; /** Čtvrtotáčky oproti poloze "zády ke zdi" (0-3); jen nábytek. */ turn?: number }
}

export type ObstacleKind = 'riser' | 'radiator' | 'window' | 'door' | 'opening' | 'fixed-round' | 'fixed-rect'
/** Stavební prvky: stoupačky, topení, okna, dveře. */
export interface Obstacle extends Placed {
  kind: ObstacleKind
  /** Přichytává se tažení ke zdi? Výchozí ano; u oken a dveří se nepoužívá (jsou vždy ve zdi). */
  snapToWalls?: boolean
  /** Dveře: strana závěsů při pohledu z místnosti na dveře (výchozí levá). */
  hinge?: 'left' | 'right'
  /** Dveře: otevírají se do místnosti (výchozí), nebo ven z ní. */
  swing?: 'in' | 'out'
}

export type FurnitureKind =
  | 'bed-single' | 'bed-double' | 'sofa' | 'table' | 'chair' | 'tv' | 'wardrobe' | 'kitchen-unit'
  | 'wc-free' | 'wc-wall' | 'shower' | 'bathtub' | 'sink'
  | 'washer' | 'dryer' | 'fridge' | 'hood'
  | 'shelf' | 'bookcase' | 'plant-small' | 'plant-large'
  | 'floor-lamp' | 'table-lamp'
export interface Furniture extends Placed {
  kind: FurnitureKind
  /** Přichytává se tažení ke zdi? Výchozí ano. */
  snapToWalls?: boolean
  /** Při přichycení ke zdi zachovat natočení kusu (po ručním otočení); jinak se přichytí zády ke zdi. */
  keepRotation?: boolean
}

/** Celý uložený projekt (to, co jde na server / do souboru). */
export interface Project {
  rooms: Room[]
  obstacles: Obstacle[]
  furniture: Furniture[]
  electric: ElectricPoint[]
  cables: Cable[]
}

export type ElectricKind = 'socket' | 'socket-double' | 'switch' | 'light' | 'board'
/** Body vodoinstalace: přípojka, zdroj teplé vody, výtok (baterie), odpady a napojení na odpadní stoupačku. */
export type PlumbingKind = 'water-main' | 'boiler' | 'tap' | 'drain' | 'drain-wc' | 'sewer'
/** Druh bodu v kolekci `electric`: elektro nebo vodoinstalace (viz `system` v katalogu). */
export type PointKind = ElectricKind | PlumbingKind

/**
 * Bod instalace: zásuvka, vypínač, rozvaděč (na zdi), světlo (na stropě), nebo bod vodoinstalace (výtok, odpad…).
 * Elektro i voda sdílejí jednu kolekci, protože se s nimi zachází stejně (poloha na zdi, tažení, spojování).
 */
export interface ElectricPoint {
  id: string
  roomId: string
  kind: PointKind
  name: string
  /** Poloha v půdorysu; platí u stropních bodů (světlo). Nástěnné body se počítají ze stěny. */
  x: number
  y: number
  /** Nástěnné body jsou připnuté ke stěně a drží se jí při změně rozměrů místnosti. */
  attach?: { edge: number; along: number }
  /** Přichytává se tažením ke zdi? Výchozí ano; vypnutý bod stojí volně v místnosti (např. odpadní stoupačka). */
  snapToWalls?: boolean
  /** Přípojka patří k nábytku (umyvadlo, sprcha): s ním se přesouvá, otáčí a maže. `fixtureRole` říká, která to je. */
  fixtureId?: string
  fixtureRole?: 'hot' | 'cold' | 'drain'
  /** Výška nad podlahou (cm) u nástěnných bodů; stropní body jsou ve výšce stropu. U rozvaděče je to jeho SPODNÍ hrana, u ostatních bodů střed. */
  height: number
  /** Rozvaděč: šířka, výška a hloubka skříně (cm); bez nich platí výchozí rozměry. */
  w?: number
  h?: number
  d?: number
}

export type ElectricCableType = 'cyky-3x1.5' | 'cyky-3x2.5' | 'cyky-5x1.5' | 'cyky-5x2.5' | 'cyky-5x4'
/** Potrubí: studená, teplá voda a odpady. */
export type PipeType = 'pipe-cold' | 'pipe-hot' | 'pipe-drain-50' | 'pipe-drain-110'
/** Vedení mezi dvěma body: kabel (elektro) nebo potrubí (voda, odpad). */
export type CableType = ElectricCableType | PipeType

/** Bod trasy kabelu v prostoru (x, y v půdorysu, z = výška nad podlahou). */
export interface Waypoint { x: number; y: number; z: number }

/** Kabel nebo potrubí mezi dvěma body. `via` jsou mezilehlé body trasy (editovatelné); konce se berou z bodů `fromId` a `toId`. */
export interface Cable {
  id: string
  type: CableType
  circuit: string
  fromId: string
  toId: string
  via: Waypoint[]
}
