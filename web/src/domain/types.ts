// Datový model projektu. Půdorys: x doprava, y dolů (v 3D odpovídá y souřadnici z). Jednotky: cm.

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'toilet' | 'hall' | 'other'
export type RoomShape = 'rect' | 'L-left' | 'L-right'
export type WallMaterial = 'plaster' | 'brick' | 'concrete' | 'tile' | 'sdk'
/** Zobrazení stěny: automaticky (skrytá, když leží uvnitř jiné místnosti), vždy plná, nebo skrytá (průhledná). */
export type WallMode = 'auto' | 'solid' | 'hidden'
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
  attach?: { edge: number; along: number }
}

export type ObstacleKind = 'riser' | 'radiator' | 'window' | 'door' | 'opening'
/** Stavební prvky: stoupačky, topení, okna, dveře. */
export interface Obstacle extends Placed { kind: ObstacleKind }

export type FurnitureKind =
  | 'bed-single' | 'bed-double' | 'sofa' | 'table' | 'chair' | 'tv' | 'wardrobe' | 'kitchen-unit'
  | 'wc-free' | 'wc-wall' | 'shower' | 'bathtub' | 'sink'
export interface Furniture extends Placed { kind: FurnitureKind }

/** Celý uložený projekt (to, co jde na server / do souboru). */
export interface Project {
  rooms: Room[]
  obstacles: Obstacle[]
  furniture: Furniture[]
  electric: ElectricPoint[]
  cables: Cable[]
}

export type ElectricKind = 'socket' | 'socket-double' | 'switch' | 'light' | 'board'

/** Elektroinstalační bod: zásuvka, vypínač, rozvaděč (na zdi) nebo světlo (na stropě). */
export interface ElectricPoint {
  id: string
  roomId: string
  kind: ElectricKind
  name: string
  /** Poloha v půdorysu; platí u stropních bodů (světlo). Nástěnné body se počítají ze stěny. */
  x: number
  y: number
  /** Nástěnné body jsou připnuté ke stěně a drží se jí při změně rozměrů místnosti. */
  attach?: { edge: number; along: number }
  /** Výška nad podlahou (cm) u nástěnných bodů; stropní body jsou ve výšce stropu. */
  height: number
}

export type CableType = 'cyky-3x1.5' | 'cyky-3x2.5' | 'cyky-5x1.5' | 'cyky-5x2.5' | 'cyky-5x4'

/** Bod trasy kabelu v prostoru (x, y v půdorysu, z = výška nad podlahou). */
export interface Waypoint { x: number; y: number; z: number }

/** Kabel mezi dvěma body. `via` jsou mezilehlé body trasy (editovatelné); konce se berou z bodů `fromId` a `toId`. */
export interface Cable {
  id: string
  type: CableType
  circuit: string
  fromId: string
  toId: string
  via: Waypoint[]
}
