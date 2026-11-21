// Stav rozhraní, který se neukládá do projektu: výběr, aktivní nástroj, nastavení 3D.
import { create } from 'zustand'

export type Selection = { type: 'room' | 'obstacle'; id: string } | null
export type Tool = 'select' | 'draw'

interface UiState {
  selection: Selection
  tool: Tool
  wallOpacity: number
  /** Zvýšení čísla vyžádá "přizpůsob pohled" v 2D editoru (ten zná svou velikost). */
  fitRequest: number
  select: (selection: Selection) => void
  setTool: (tool: Tool) => void
  setWallOpacity: (value: number) => void
  requestFit: () => void
}

export const useUiStore = create<UiState>()(set => ({
  selection: null,
  tool: 'select',
  wallOpacity: 1,
  fitRequest: 0,
  select: selection => set({ selection }),
  setTool: tool => set({ tool }),
  setWallOpacity: wallOpacity => set({ wallOpacity }),
  requestFit: () => set(s => ({ fitRequest: s.fitRequest + 1 })),
}))
