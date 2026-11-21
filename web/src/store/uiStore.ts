// Stav rozhraní, který se neukládá do projektu: výběr, aktivní nástroj, nastavení 3D.
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { isDecor } from '../domain/furnitureCatalog'
import { systemOfLine, systemOfPoint } from '../domain/electricCatalog'
import type { CableType, FurnitureKind, PipeType, PointKind } from '../domain/types'

export type Selection = { type: 'room' | 'obstacle' | 'furniture' | 'electric' | 'cable'; id: string } | null
/** Záložka v horní liště; určuje, jaké nástroje jsou v levém panelu. */
export type Mode = 'plan' | 'equipment' | 'decor' | 'electro' | 'plumbing'
export type Tool = 'select' | 'draw' | 'cable'
/** Elektro ve 3D: skryté, zobrazené (zakryté zdmi a stropem), nebo "rentgen" (vidět skrz zdi, strop i nábytek). */
export type ElectroView = 'off' | 'on' | 'xray'
/** Strop ve 3D: skrytý (výchozí, aby šlo shora do místností), plný, nebo průhledný s viditelným rastrem profilů. */
export type CeilingView = 'off' | 'solid' | 'transparent'
/** Stěna zvýrazněná v plánu (např. při najetí na řádek v panelu). */
export type WallHighlight = { roomId: string; edge: number } | null

interface UiState {
  selection: Selection
  tool: Tool
  mode: Mode
  wallOpacity: number
  /** Ve 3D zprůhlednit "přední" stěny (ty, které hledí na kameru), aby šlo dovnitř. */
  ghostFrontWalls: boolean
  furnitureOpacity: number
  ceilingView: CeilingView
  electroView: ElectroView
  /** Při kreslení kabelu: bod, ze kterého kabel vychází (po prvním kliknutí). */
  cableStart: string | null
  /** Typ kabelu, který se vytvoří při dalším propojení. */
  cableType: CableType
  /** Typ potrubí, které se vytvoří při dalším propojení v záložce Vodoinstalace. */
  pipeType: PipeType
  /** Je 3D pohled rozbalený v pravém panelu? */
  show3d: boolean
  /** Je půdorys rozbalený? (sbaluje se doleva; aspoň jeden z panelů zůstane otevřený) */
  showPlan: boolean
  hoveredWall: WallHighlight
  /** Zvýšení čísla vyžádá "přizpůsob pohled" v 2D editoru (ten zná svou velikost). */
  fitRequest: number
  select: (selection: Selection) => void
  setTool: (tool: Tool) => void
  /** Přepne záložku; rozpracovaný nástroj (kreslení místnosti, kabelu) se ukončí. */
  setMode: (mode: Mode) => void
  setWallOpacity: (value: number) => void
  toggleGhostFrontWalls: () => void
  setFurnitureOpacity: (value: number) => void
  setCeilingView: (view: CeilingView) => void
  setElectroView: (view: ElectroView) => void
  setCableStart: (id: string | null) => void
  setCableType: (type: CableType) => void
  setPipeType: (type: PipeType) => void
  toggle3d: () => void
  togglePlan: () => void
  setHoveredWall: (wall: WallHighlight) => void
  requestFit: () => void
}

/** Panely, jejichž sbalení si aplikace pamatuje mezi spuštěními. */
interface SavedPanels { show3d: boolean; showPlan: boolean }

/**
 * Obnoví uložené sbalení panelů. Chybějící nebo poškozená hodnota znamená "rozbaleno"
 * a nikdy nezůstanou sbalené oba panely najednou (nebylo by co zobrazit).
 */
export function restorePanels(saved: unknown): SavedPanels {
  const s = (saved ?? {}) as Partial<SavedPanels>
  const show3d = typeof s.show3d === 'boolean' ? s.show3d : true
  const showPlan = typeof s.showPlan === 'boolean' ? s.showPlan : true
  return show3d || showPlan ? { show3d, showPlan } : { show3d: true, showPlan: true }
}

/** Úložiště prohlížeče; tam, kde není (testy, zablokované úložiště), se nic neukládá a nic nepadá. */
const noopStorage: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const stateStorage = (): StateStorage => {
  try { return typeof localStorage === 'undefined' ? noopStorage : localStorage } catch { return noopStorage }
}
const browserStorage = createJSONStorage<SavedPanels>(stateStorage)

export const useUiStore = create<UiState>()(persist(set => ({
  selection: null,
  tool: 'select',
  mode: 'plan',
  wallOpacity: 1,
  ghostFrontWalls: true,
  furnitureOpacity: 1,
  ceilingView: 'off',
  electroView: 'on',
  cableStart: null,
  cableType: 'cyky-3x1.5',
  pipeType: 'pipe-cold',
  show3d: true,
  showPlan: true,
  hoveredWall: null,
  fitRequest: 0,
  select: selection => set({ selection }),
  setTool: tool => set({ tool }),
  setMode: mode => set({ mode, tool: 'select', cableStart: null }),
  setWallOpacity: wallOpacity => set({ wallOpacity }),
  toggleGhostFrontWalls: () => set(s => ({ ghostFrontWalls: !s.ghostFrontWalls })),
  setFurnitureOpacity: furnitureOpacity => set({ furnitureOpacity }),
  setCeilingView: ceilingView => set({ ceilingView }),
  setElectroView: electroView => set({ electroView }),
  setCableStart: cableStart => set({ cableStart }),
  setCableType: cableType => set({ cableType }),
  setPipeType: pipeType => set({ pipeType }),
  toggle3d: () => set(s => (s.show3d && !s.showPlan ? s : { show3d: !s.show3d })),
  togglePlan: () => set(s => (s.showPlan && !s.show3d ? s : { showPlan: !s.showPlan })),
  setHoveredWall: hoveredWall => set({ hoveredWall }),
  requestFit: () => set(s => ({ fitRequest: s.fitRequest + 1 })),
}), {
  name: 'visual-planner-ui',
  storage: browserStorage,
  // ukládá se jen sbalení půdorysu a 3D (výběr, nástroj apod. patří jen aktuální relaci)
  partialize: (s): SavedPanels => ({ show3d: s.show3d, showPlan: s.showPlan }),
  merge: (saved, current) => ({ ...current, ...restorePanels(saved) }),
}))

/**
 * Která záložka smí upravovat jaký druh věcí (přesouvat, měnit rozměry, mazat): každá záložka edituje svou vrstvu.
 * Platí stejně pro 2D plán, 3D pohled, postranní panel i klávesové zkratky.
 */
export const SELECTION_MODE: Record<NonNullable<Selection>['type'], Mode> = {
  room: 'plan',
  obstacle: 'plan',      // okna, dveře, stoupačky, topení
  furniture: 'equipment',
  electric: 'electro',
  cable: 'electro',
}

/** Druh konkrétní věci, podle kterého se pozná záložka: nábytek (dekorace), bod instalace (voda), vedení (potrubí). */
export type ItemKind = { furniture?: FurnitureKind; point?: PointKind; line?: CableType }

/** Záložka, která upravuje daný druh věci; u nábytku, bodů a vedení záleží na druhu (dekorace, voda). */
export function modeOf(type: NonNullable<Selection>['type'], kind: ItemKind = {}): Mode {
  if (type === 'furniture' && kind.furniture && isDecor(kind.furniture)) return 'decor'
  if (type === 'electric' && kind.point && systemOfPoint(kind.point) === 'plumbing') return 'plumbing'
  if (type === 'cable' && kind.line && systemOfLine(kind.line) === 'plumbing') return 'plumbing'
  return SELECTION_MODE[type]
}

export const canEditInMode = (type: NonNullable<Selection>['type'], mode: Mode, kind: ItemKind = {}) =>
  modeOf(type, kind) === mode
