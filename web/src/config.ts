// Ladicí konstanty editoru. Všechny délky jsou v centimetrech.

export const SNAP_STEP = 5               // mřížka, na kterou se zaokrouhlují tažené rozměry
export const MIN_EDGE = 30               // nejkratší povolená stěna
export const MIN_DRAWN_ROOM = 60         // nejmenší místnost, která se vytvoří nakreslením
export const MAGNET_DISTANCE = 12        // do jaké vzdálenosti se stěny přitahují k sousedním místnostem
export const OBSTACLE_WALL_SNAP = 30     // do jaké vzdálenosti od stěny se překážka k ní přichytí

export const DEFAULT_WALL_THICKNESS = 10
export const MIN_WALL = 2                // nejtenčí / nejtlustší zeď, kterou lze zadat
export const MAX_WALL = 100
export const MAX_SHARED_WALL = 50        // mezera mezi místnostmi, která se ještě považuje za jednu sdílenou zeď
export const MIN_SHARED_OVERLAP = 10    // jak dlouho se stěny musí překrývat, aby tvořily sdílenou zeď
export const DEFAULT_ROOM_HEIGHT = 260

export const PROJECT_ID = 'default'      // zatím pracujeme s jedním projektem
