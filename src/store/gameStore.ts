import { create } from 'zustand'
import type { CropType, TileData, PlotState, TooltipData, MarketEvent, Season, BuildingData } from '../types'
import { CropManager } from '../modules/CropManager'
import { SaveManager } from '../modules/SaveManager'
import { LandExpansionManager } from '../modules/LandExpansionManager'
import { marketPriceEngine } from '../modules/MarketPriceEngine'
import { getAdjustedGrowDuration, SEASON_CONFIGS } from '../modules/SeasonManager'
import { BUILDING_DEFS, BARN_BONUS, getEffectiveGrowDuration } from '../modules/BuildingManager'

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
  buildings: Record<string, BuildingData>
  balance: number
  inventory: Record<CropType, number>
  selectedTile: { x: number; y: number } | null
  selectedTiles: { x: number; y: number }[]
  buildingMenuTile: { x: number; y: number } | null
  marketOpen: boolean
  tooltip: TooltipData | null
  marketPrices: Record<CropType, number>
  priceHistories: Record<CropType, number[]>
  lastMarketEvent: MarketEvent | null
  currentSeason: Season
  seasonStartedAt: number
}

export interface GameActions {
  plantCrop: (x: number, y: number, cropType: CropType) => void
  plantCropMulti: (tiles: { x: number; y: number }[], cropType: CropType) => void
  harvestPlot: (x: number, y: number) => void
  harvestMulti: (tiles: { x: number; y: number }[]) => void
  buyLand: (x: number, y: number) => void
  sellCrop: (cropType: CropType, amount: number) => void
  placeBuilding: (x: number, y: number, type: import('../types').BuildingType) => void
  tickCrops: () => void
  updateMarketPrices: (prices: Record<CropType, number>, histories: Record<CropType, number[]>, event: MarketEvent | null) => void
  updateSeason: (season: Season, startedAt: number) => void
  setSelectedTile: (pos: { x: number; y: number } | null) => void
  setSelectedTiles: (tiles: { x: number; y: number }[]) => void
  setBuildingMenuTile: (pos: { x: number; y: number } | null) => void
  setTooltip: (tooltip: TooltipData | null) => void
  toggleMarket: () => void
  loadGame: () => void
}

type Store = GameState & GameActions

function persist(state: GameState) {
  SaveManager.save({
    grid: state.grid,
    plots: state.plots,
    buildings: state.buildings,
    balance: state.balance,
    inventory: state.inventory,
    marketPrices: state.marketPrices,
    priceHistories: state.priceHistories,
    lastMarketEvent: state.lastMarketEvent,
    currentSeason: state.currentSeason,
    seasonStartedAt: state.seasonStartedAt,
  })
}

const initialPrices = marketPriceEngine.getAllPrices()
const initialHistories = marketPriceEngine.getAllHistories()

export const useGameStore = create<Store>((set, get) => ({
  grid: createInitialGrid(),
  plots: {},
  buildings: {},
  balance: STARTING_BALANCE,
  inventory: createInitialInventory(),
  selectedTile: null,
  selectedTiles: [],
  buildingMenuTile: null,
  marketOpen: false,
  tooltip: null,
  marketPrices: initialPrices,
  priceHistories: initialHistories,
  lastMarketEvent: null,
  currentSeason: 'spring' as Season,
  seasonStartedAt: Date.now(),

  plantCrop: (x, y, cropType) => {
    const s = get()
    const tile = s.grid[y][x]
    const key = `${x},${y}`
    const isEmptyPlot = tile.type === 'plot' && (!s.plots[key] || s.plots[key].status === 'empty')
    if (tile.type !== 'unlocked' && !isEmptyPlot) return

    const cropDef = CropManager.getCropDefinition(cropType)
    if (s.balance < cropDef.seedCost) return

    const newGrid = s.grid.map(row => row.map(t => ({ ...t })))
    newGrid[y][x] = { x, y, type: 'plot' }
    const gridWithRoads = newGrid

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

  plantCropMulti: (tiles, cropType) => {
    const s = get()
    const cropDef = CropManager.getCropDefinition(cropType)

    const validTiles = tiles.filter(({ x, y }) => {
      const tile = s.grid[y][x]
      const key = `${x},${y}`
      const isEmptyPlot = tile.type === 'plot' && (!s.plots[key] || s.plots[key].status === 'empty')
      return tile.type === 'unlocked' || isEmptyPlot
    })
    if (validTiles.length === 0) return

    const totalCost = cropDef.seedCost * validTiles.length
    if (s.balance < totalCost) return

    const newGrid = s.grid.map(row => row.map(t => ({ ...t })))
    const newPlots = { ...s.plots }
    const now = Date.now()

    for (const { x, y } of validTiles) {
      const key = `${x},${y}`
      newGrid[y][x] = { x, y, type: 'plot' }
      newPlots[key] = { cropType, plantedAt: now, status: 'growing' }
    }

    const next: GameState = {
      ...s,
      grid: newGrid,
      plots: newPlots,
      balance: s.balance - totalCost,
      selectedTiles: [],
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

  harvestMulti: (tiles) => {
    const s = get()
    const newInventory = { ...s.inventory }
    const newPlots = { ...s.plots }

    for (const { x, y } of tiles) {
      const key = `${x},${y}`
      const plot = s.plots[key]
      if (!plot || plot.status !== 'harvestable' || !plot.cropType) continue
      newInventory[plot.cropType] = (newInventory[plot.cropType] ?? 0) + 1
      newPlots[key] = { cropType: null, plantedAt: null, status: 'empty' as const }
    }

    const next: GameState = { ...s, plots: newPlots, inventory: newInventory, selectedTiles: [] }
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
    const gridWithRoads = newGrid

    const next: GameState = { ...s, grid: gridWithRoads, balance: s.balance - cost, selectedTile: null }
    set(next)
    persist(next)
  },

  sellCrop: (cropType, amount) => {
    const s = get()
    const have = s.inventory[cropType] ?? 0
    const toSell = Math.min(amount, have)
    if (toSell <= 0) return

    const livePrice = s.marketPrices[cropType] ?? CropManager.getCropDefinition(cropType).sellPrice
    // Find the selected tile position for barn bonus — use selectedTile if set, otherwise check all plots
    // For market sells we apply barn bonus if ANY barn is on the farm (simplest UX)
    const barnBonus = Object.values(s.buildings).some(b => b.type === 'barn') ? BARN_BONUS : 1
    const effectivePrice = Math.round(livePrice * barnBonus)
    const newInventory = { ...s.inventory, [cropType]: have - toSell }
    const next: GameState = { ...s, inventory: newInventory, balance: s.balance + toSell * effectivePrice }
    set(next)
    persist(next)
  },

  placeBuilding: (x, y, type) => {
    const s = get()
    const tile = s.grid[y][x]
    const key = `${x},${y}`
    const plotState = s.plots[key]
    const isEmptyPlot = tile.type === 'plot' && (!plotState || plotState.status === 'empty')
    if (tile.type !== 'unlocked' && !isEmptyPlot) return
    const def = BUILDING_DEFS[type]
    if (s.balance < def.cost) return

    const newGrid = s.grid.map(row => row.map(t => ({ ...t })))
    newGrid[y][x] = { x, y, type: 'building' }
    const gridWithRoads = newGrid

    // Clean up any leftover plot state
    const newPlots = { ...s.plots }
    delete newPlots[key]

    const newBuildings: Record<string, BuildingData> = {
      ...s.buildings,
      [key]: { type, placedAt: Date.now() },
    }

    const next: GameState = {
      ...s,
      grid: gridWithRoads,
      plots: newPlots,
      buildings: newBuildings,
      balance: s.balance - def.cost,
      buildingMenuTile: null,
    }
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
      const [x, y] = key.split(',').map(Number)
      const def = CropManager.getCropDefinition(plot.cropType)
      const seasonMod = SEASON_CONFIGS[s.currentSeason].growthMod[plot.cropType]
      const seasonAdjusted = getAdjustedGrowDuration(def.growDuration, plot.cropType, s.currentSeason)
      const effectiveDuration = getEffectiveGrowDuration(
        seasonAdjusted, plot.cropType, x, y,
        s.buildings as Record<string, { type: import('../types').BuildingType }>,
        seasonMod, def.growDuration
      )
      if (now - plot.plantedAt >= effectiveDuration) {
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

  updateSeason: (season, startedAt) => {
    const s = get()
    const next: GameState = { ...s, currentSeason: season, seasonStartedAt: startedAt }
    set(next)
    persist(next)
  },

  setSelectedTile: pos => set({ selectedTile: pos }),
  setSelectedTiles: tiles => set({ selectedTiles: tiles }),
  setBuildingMenuTile: pos => set({ buildingMenuTile: pos }),
  setTooltip: tooltip => set({ tooltip }),
  toggleMarket: () => set(s => ({ marketOpen: !s.marketOpen })),

  loadGame: () => {
    const saved = SaveManager.load()
    if (!saved) return

    if (saved.marketPrices && saved.priceHistories) {
      marketPriceEngine.deserialize({ prices: saved.marketPrices, histories: saved.priceHistories })
    }

    // Migrate old saves: convert any 'road' tiles to 'unlocked'
    const grid = (saved.grid ?? createInitialGrid()).map(row =>
      row.map(t => (t.type as string) === 'road' ? { ...t, type: 'unlocked' as const } : t)
    )

    set({
      grid,
      plots: saved.plots ?? {},
      buildings: saved.buildings ?? {},
      balance: saved.balance ?? STARTING_BALANCE,
      inventory: saved.inventory ?? createInitialInventory(),
      marketPrices: saved.marketPrices ?? marketPriceEngine.getAllPrices(),
      priceHistories: saved.priceHistories ?? marketPriceEngine.getAllHistories(),
      lastMarketEvent: saved.lastMarketEvent ?? null,
      currentSeason: saved.currentSeason ?? 'spring',
      seasonStartedAt: saved.seasonStartedAt ?? Date.now(),
    })
  },
}))
