export type CropType = 'wheat' | 'corn' | 'pumpkin'

export type TileType = 'locked' | 'unlocked' | 'road' | 'plot'

export type PlotStatus = 'empty' | 'growing' | 'harvestable'

export interface CropDefinition {
  type: CropType
  name: string
  emoji: string
  growDuration: number // ms
  seedCost: number
  sellPrice: number // base / reference price
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

export interface MarketEvent {
  name: string
  description: string
  cropType: CropType
  multiplier: number // e.g. 1.45 = +45%, 0.65 = -35%
  firedAt: number // Date.now()
}

export interface PersistedState {
  grid: TileData[][]
  plots: Record<string, PlotState>
  balance: number
  inventory: Record<CropType, number>
  marketPrices: Record<CropType, number>
  priceHistories: Record<CropType, number[]>
  lastMarketEvent: MarketEvent | null
}

