// Všechny rozměry jsou v centimetrech. Půdorys: x doprava, y dolů. 3D: z = y.
export interface Pt { x: number; y: number }

export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'toilet' | 'hall' | 'other'
export type RoomShape = 'rect' | 'L-left' | 'L-right'

export interface Room {
  id: string
  name: string
  type: RoomType
  pts: Pt[]        // rektilineární polygon (vnitřní líc stěn)
  wallT: number    // tloušťka stěn
  height: number   // světlá výška
}

export type ObsKind = 'riser' | 'radiator' | 'window' | 'door'

export interface Obstacle {
  id: string
  roomId: string
  kind: ObsKind
  w: number        // šířka podél stěny
  d: number        // hloubka od stěny
  h: number
  elev: number     // výška spodní hrany od podlahy
  x: number; y: number; rot: number  // použito jen pokud není připnuto ke stěně
  attach?: { edge: number; along: number } // držení u stěny při změně rozměrů
}

export type Selection = { type: 'room' | 'obs'; id: string } | null
