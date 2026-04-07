import { create } from 'zustand'
import type { CropType, TileData, PlotState, TooltipData, MarketEvent } from '../types'
import { CropManager } from '../modules/CropManager'
import { SaveManager } from '../modules/SaveManager'
import { recomputeRoads } from '../modules/RoadManager'
import { LandExpansionManager } from '../modules/LandExpansionManager'
import { marketPriceEngine } from '../modules/MarketPriceEngine'

const GRID_SIZE = 9
const STARTING_BALANCE = 200

function createInitialGrid(): TileData[][] {
  return Array.from({ length: GRID_SIZE }, (_, y) =>
    Array.from({ length: GRID_SIZE }, (_, x) => {
      const inCenter = x >= 3 && x <= 5 && y >= 3 && y <= 5
      return { x, y, type: inCenter ? ('unlocked' as const) : ('locked' as const) }
    })
  )
}

function createInitialInventory(): Record<CropType, number> {
  return { wheat: 0, corn: 0, pumpkin: 0 }
}

export interface GameState {
  grid: TileData[][]
  plots: Record<string, PlotState>
  balance: number
  inventory: Record<CropType, number>
  selectedTile: { x: number; y: number } | null
  marketOpen: boolean
  tooltip: TooltipData | null
  marketPrices: Record<CropType, number>
  priceHistories: Record<CropType, number[]>
  lastMarketEvent: MarketEvent | null
}

export interface GameActions {
  plantCrop: (x: number, y: number, cropType: CropType) => void
  harvestPlot: (x: number, y: number) => void
  buyLand: (x: number, y: number) => void
  sellCrop: (cropType: CropType, amount: number) => void
  tickCrops: () => void
  updateMarketPrices: (prices: Record<CropType, number>, histories: Record<CropType, number[]>, event: MarketEvent | null) => void
  setSelectedTile: (pos: { x: number; y: number } | null) => void
  setTooltip: (tooltip: TooltipData | null) => void
  toggleMarket: () => void
  loadGame: () => void
}

type Store = GameState & GameActions

function persist(state: GameState) {
  SaveManager.save({
    grid: state.grid,
    plots: state.plots,
    balance: state.balance,
    inventory: state.inventory,
    marketPrices: state.marketPrices,
    priceHistories: state.priceHistories,
    lastMarketEvent: state.lastMarketEvent,
  })
}

const initialPrices = marketPriceEngine.getAllPrices()
const initialHistories = marketPriceEngine.getAllHistories()

export const useGameStore = create<Store>((set, get) => ({
  grid: createInitialGrid(),
  plots: {},
  balance: STARTING_BALANCE,
  inventory: createInitialInventory(),
  selectedTile: null,
  marketOpen: false,
  tooltip: null,
  marketPrices: initialPrices,
  priceHistories: initialHistories,
  lastMarketEvent: null,

  plantCrop: (x, y, cropType) => {
    const s = get()
    const tile = s.grid[y][x]
    const key = `${x},${y}`
    const isEmptyPlot = tile.type === 'plot' && (!s.plots[key] || s.plots[key].status === 'empty')
    if (tile.type !== 'unlocked' && tile.type !== 'road' && !isEmptyPlot) return

    const cropDef = CropManager.getCropDefinition(cropType)
    if (s.balance < cropDef.seedCost) return

    const newGrid = s.grid.map(row => row.map(t => ({ ...t })))
    newGrid[y][x] = { x, y, type: 'plot' }
    const gridWithRoads = recomputeRoads(newGrid)

    const newPlots: Record<string, PlotState> = {
      ...s.plots,
      [key]: { cropType, plantedAt: Date.now(), status: 'growing' },
    }

    const next: GameState = {
      ...s,
      grid: gridWithRoads,
      plots: newPlots,
      balance: s.balance - cropDef.seedCost,
      selectedTile: null,
    }
    set(next)
    persist(next)
  },

  harvestPlot: (x, y) => {
    const s = get()
    const key = `${x},${y}`
    const plot = s.plots[key]
    if (!plot || plot.status !== 'harvestable' || !plot.cropType) return

    const newInventory = { ...s.inventory, [plot.cropType]: (s.inventory[plot.cropType] ?? 0) + 1 }
    const newPlots = { ...s.plots, [key]: { cropType: null, plantedAt: null, status: 'empty' as const } }

    const next: GameState = { ...s, plots: newPlots, inventory: newInventory, selectedTile: null }
    set(next)
    persist(next)
  },

  buyLand: (x, y) => {
    const s = get()
    const tile = s.grid[y][x]
    if (tile.type !== 'locked') return
    if (!LandExpansionManager.isAdjacentToUnlocked(s.grid, x, y)) return

    const cost = LandExpansionManager.getLandCost(x, y)
    if (s.balance < cost) return

    const newGrid = s.grid.map(row => row.map(t => ({ ...t })))
    newGrid[y][x] = { x, y, type: 'unlocked' }
    const gridWithRoads = recomputeRoads(newGrid)

    const next: GameState = { ...s, grid: gridWithRoads, balance: s.balance - cost, selectedTile: null }
    set(next)
    persist(next)
  },

  sellCrop: (cropType, amount) => {
    const s = get()
    const have = s.inventory[cropType] ?? 0
    const toSell = Math.min(amount, have)
    if (toSell <= 0) return

    // Use the live market price instead of the static base price
    const livePrice = s.marketPrices[cropType] ?? CropManager.getCropDefinition(cropType).sellPrice
    const newInventory = { ...s.inventory, [cropType]: have - toSell }
    const next: GameState = { ...s, inventory: newInventory, balance: s.balance + toSell * livePrice }
    set(next)
    persist(next)
  },

  tickCrops: () => {
    const s = get()
    const now = Date.now()
    let changed = false
    const newPlots = { ...s.plots }

    for (const [key, plot] of Object.entries(newPlots)) {
      if (plot.status !== 'growing' || !plot.cropType || !plot.plantedAt) continue
      const def = CropManager.getCropDefinition(plot.cropType)
      if (now - plot.plantedAt >= def.growDuration) {
        newPlots[key] = { ...plot, status: 'harvestable' }
        changed = true
      }
    }

    if (changed) {
      const next: GameState = { ...s, plots: newPlots }
      set(next)
      persist(next)
    }
  },

  updateMarketPrices: (prices, histories, event) => {
    const s = get()
    const next: GameState = {
      ...s,
      marketPrices: prices,
      priceHistories: histories,
      lastMarketEvent: event ?? s.lastMarketEvent,
    }
    set(next)
    persist(next)
  },

  setSelectedTile: pos => set({ selectedTile: pos }),
  setTooltip: tooltip => set({ tooltip }),
  toggleMarket: () => set(s => ({ marketOpen: !s.marketOpen })),

  loadGame: () => {
    const saved = SaveManager.load()
    if (!saved) return

    // Restore market engine state if available
    if (saved.marketPrices && saved.priceHistories) {
      marketPriceEngine.deserialize({ prices: saved.marketPrices, histories: saved.priceHistories })
    }

    set({
      grid: saved.grid ?? createInitialGrid(),
      plots: saved.plots ?? {},
      balance: saved.balance ?? STARTING_BALANCE,
      inventory: saved.inventory ?? createInitialInventory(),
      marketPrices: saved.marketPrices ?? marketPriceEngine.getAllPrices(),
      priceHistories: saved.priceHistories ?? marketPriceEngine.getAllHistories(),
      lastMarketEvent: saved.lastMarketEvent ?? null,
    })
  },
}))
