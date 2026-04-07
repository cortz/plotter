export type CropType = 'wheat' | 'corn' | 'pumpkin'

export type TileType = 'locked' | 'unlocked' | 'road' | 'plot'

export type PlotStatus = 'empty' | 'growing' | 'harvestable'

export interface CropDefinition {
  type: CropType
  name: string
  emoji: string
  growDuration: number // ms
  seedCost: number
  sellPrice: number
  color: number // Three.js hex
}

export interface TileData {
  x: number
  y: number
  type: TileType
}

export interface PlotState {
  cropType: CropType | null
  plantedAt: number | null
  status: PlotStatus
}

export interface TooltipData {
  content: string
}

export interface PersistedState {
  grid: TileData[][]
  plots: Record<string, PlotState>
  balance: number
  inventory: Record<CropType, number>
}
