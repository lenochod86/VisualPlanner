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

export type ObstacleKind = 'riser' | 'radiator' | 'window' | 'door'

export interface Obstacle {
  id: string
  roomId: string
  kind: ObstacleKind
  w: number          // šířka podél stěny
  d: number          // hloubka od stěny
  h: number
  elev: number       // výška spodní hrany nad podlahou
  /** Volná poloha; platí jen když překážka není připnutá ke stěně. */
  x: number
  y: number
  rot: number
  /** Připnutí ke stěně: překážka sleduje stěnu při změně rozměrů místnosti. */
  attach?: { edge: number; along: number }
}

/** Celý uložený projekt (to, co jde na server / do souboru). */
export interface Project {
  rooms: Room[]
  obstacles: Obstacle[]
}
