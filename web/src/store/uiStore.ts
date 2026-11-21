// Stav rozhraní, který se neukládá do projektu: výběr, aktivní nástroj, nastavení 3D.
import { create } from 'zustand'
import type { CableType } from '../domain/types'

export type Selection = { type: 'room' | 'obstacle' | 'furniture' | 'electric' | 'cable'; id: string } | null
/** Záložka v horní liště; určuje, jaké nástroje jsou v levém panelu. */
export type Mode = 'plan' | 'equipment' | 'electro'
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
  furnitureOpacity: number
  ceilingView: CeilingView
  electroView: ElectroView
  /** Při kreslení kabelu: bod, ze kterého kabel vychází (po prvním kliknutí). */
  cableStart: string | null
  /** Typ kabelu, který se vytvoří při dalším propojení. */
  cableType: CableType
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
  setFurnitureOpacity: (value: number) => void
  setCeilingView: (view: CeilingView) => void
  setElectroView: (view: ElectroView) => void
  setCableStart: (id: string | null) => void
  setCableType: (type: CableType) => void
  toggle3d: () => void
  togglePlan: () => void
  setHoveredWall: (wall: WallHighlight) => void
  requestFit: () => void
}

export const useUiStore = create<UiState>()(set => ({
  selection: null,
  tool: 'select',
  mode: 'plan',
  wallOpacity: 1,
  furnitureOpacity: 1,
  ceilingView: 'off',
  electroView: 'on',
  cableStart: null,
  cableType: 'cyky-3x1.5',
  show3d: true,
  showPlan: true,
  hoveredWall: null,
  fitRequest: 0,
  select: selection => set({ selection }),
  setTool: tool => set({ tool }),
  setMode: mode => set({ mode, tool: 'select', cableStart: null }),
  setWallOpacity: wallOpacity => set({ wallOpacity }),
  setFurnitureOpacity: furnitureOpacity => set({ furnitureOpacity }),
  setCeilingView: ceilingView => set({ ceilingView }),
  setElectroView: electroView => set({ electroView }),
  setCableStart: cableStart => set({ cableStart }),
  setCableType: cableType => set({ cableType }),
  toggle3d: () => set(s => (s.show3d && !s.showPlan ? s : { show3d: !s.show3d })),
  togglePlan: () => set(s => (s.showPlan && !s.show3d ? s : { showPlan: !s.showPlan })),
  setHoveredWall: hoveredWall => set({ hoveredWall }),
  requestFit: () => set(s => ({ fitRequest: s.fitRequest + 1 })),
}))
