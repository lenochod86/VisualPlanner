// Datový model projektu. Půdorys: x doprava, y dolů (v 3D odpovídá y souřadnici z). Jednotky: cm.

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'toilet' | 'hall' | 'other'
export type RoomShape = 'rect' | 'L-left' | 'L-right'

export interface Room {
  id: string
  name: string
  type: RoomType
  /** Rektilineární polygon = vnitřní líc stěn. Stěny se kreslí směrem ven. */
  pts: Pt[]
  /** Tloušťka zdi u každé stěny (stejné pořadí jako `pts`). Sdílená zeď má tloušťku danou mezerou mezi místnostmi, viz geometry/walls.ts. */
  walls: number[]
  height: number
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

export type ObstacleKind = 'riser' | 'radiator' | 'window' | 'door'
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
}
