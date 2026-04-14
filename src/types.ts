export type CropType = 'wheat' | 'corn' | 'pumpkin'

export type TileType = 'locked' | 'unlocked' | 'plot' | 'building'

export type BuildingType = 'barn' | 'greenhouse' | 'windmill'

export type PlotStatus = 'empty' | 'growing' | 'harvestable' | 'spoiled'

export type InventoryItem = CropType | 'compost'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export interface BuildingData {
  type: BuildingType
  placedAt: number // Date.now()
}

export interface BuildingDefinition {
  type: BuildingType
  name: string
  emoji: string
  description: string
  cost: number
  color: number // Three.js hex for the mesh
}

export interface SeasonConfig {
  emoji: string
  label: string
  description: string
  /** Grow duration multiplier per crop (< 1 = faster) */
  growthMod: Record<CropType, number>
  /** Base sell-price multiplier per crop (shifts market mean reversion target) */
  priceMod: Record<CropType, number>
  /** Three.js clear color (sky) */
  skyColor: number
  /** Ambient light color */
  ambientColor: number
  /** Unlocked tile color */
  unlockedColor: number
}

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
  harvestableAt: number | null
  spoilsAt: number | null
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
  buildings: Record<string, BuildingData>
  balance: number
  inventory: Record<InventoryItem, number[]>
  marketPrices: Record<CropType, number>
  priceHistories: Record<CropType, number[]>
  lastMarketEvent: MarketEvent | null
  currentSeason: Season
  seasonStartedAt: number
  seasonSoldCounts: Record<CropType, number>
}

