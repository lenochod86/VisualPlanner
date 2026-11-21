// Stav rozhraní, který se neukládá do projektu: výběr, aktivní nástroj, nastavení 3D.
import { create } from 'zustand'

export type Selection = { type: 'room' | 'obstacle' | 'furniture'; id: string } | null
export type Tool = 'select' | 'draw'
/** Strop ve 3D: skrytý (výchozí, aby šlo shora do místností), plný, nebo průhledný s viditelným rastrem profilů. */
export type CeilingView = 'off' | 'solid' | 'transparent'
/** Stěna zvýrazněná v plánu (např. při najetí na řádek v panelu). */
export type WallHighlight = { roomId: string; edge: number } | null

interface UiState {
  selection: Selection
  tool: Tool
  wallOpacity: number
  furnitureOpacity: number
  ceilingView: CeilingView
  /** Je 3D pohled rozbalený v pravém panelu? */
  show3d: boolean
  hoveredWall: WallHighlight
  /** Zvýšení čísla vyžádá "přizpůsob pohled" v 2D editoru (ten zná svou velikost). */
  fitRequest: number
  select: (selection: Selection) => void
  setTool: (tool: Tool) => void
  setWallOpacity: (value: number) => void
  setFurnitureOpacity: (value: number) => void
  setCeilingView: (view: CeilingView) => void
  toggle3d: () => void
  setHoveredWall: (wall: WallHighlight) => void
  requestFit: () => void
}

export const useUiStore = create<UiState>()(set => ({
  selection: null,
  tool: 'select',
  wallOpacity: 1,
  furnitureOpacity: 1,
  ceilingView: 'off',
  show3d: true,
  hoveredWall: null,
  fitRequest: 0,
  select: selection => set({ selection }),
  setTool: tool => set({ tool }),
  setWallOpacity: wallOpacity => set({ wallOpacity }),
  setFurnitureOpacity: furnitureOpacity => set({ furnitureOpacity }),
  setCeilingView: ceilingView => set({ ceilingView }),
  toggle3d: () => set(s => ({ show3d: !s.show3d })),
  setHoveredWall: hoveredWall => set({ hoveredWall }),
  requestFit: () => set(s => ({ fitRequest: s.fitRequest + 1 })),
}))
