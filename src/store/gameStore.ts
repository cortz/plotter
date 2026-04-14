import { create } from 'zustand'
import type { CropType, TileData, PlotState, TooltipData, MarketEvent, Season, BuildingData, InventoryItem } from '../types'
import { CropManager, SPOIL_DURATION_MS, COMPOST_GROWTH_MOD, INVENTORY_SPOIL_MS, getSupplyPressureMod } from '../modules/CropManager'
import { SaveManager } from '../modules/SaveManager'
import { LandExpansionManager } from '../modules/LandExpansionManager'
import { marketPriceEngine } from '../modules/MarketPriceEngine'
import { getAdjustedGrowDuration, SEASON_CONFIGS } from '../modules/SeasonManager'
import { BUILDING_DEFS, BARN_BONUS, getEffectiveGrowDuration, tileDistance } from '../modules/BuildingManager'

const GRID_SIZE = 9
const STARTING_BALANCE = 200

/** Compute the absolute timestamp when a crop at (x,y) will be harvestable.
 * @param extraMod - optional additional multiplier (e.g. COMPOST_GROWTH_MOD)
 */
function computeHarvestableAt(
  x: number,
  y: number,
  cropType: CropType,
  plantedAt: number,
  season: Season,
  buildings: Record<string, { type: import('../types').BuildingType }>,
  extraMod = 1,
): number {
  const def = CropManager.getCropDefinition(cropType)
  const seasonMod = SEASON_CONFIGS[season].growthMod[cropType]
  const seasonAdjusted = getAdjustedGrowDuration(def.growDuration, cropType, season)
  const effectiveDuration = getEffectiveGrowDuration(seasonAdjusted, cropType, x, y, buildings, seasonMod, def.growDuration)
  return plantedAt + Math.round(effectiveDuration * extraMod)
}

/**
 * After a building is placed or sold, recompute harvestableAt for all growing
 * plots whose duration is affected (windmill → all plots; greenhouse → adjacent plots).
 * newBuildings must already reflect the change.
 */
function refreshHarvestableAt(
  plots: Record<string, PlotState>,
  buildingType: import('../types').BuildingType,
  bx: number,
  by: number,
  season: Season,
  newBuildings: Record<string, { type: import('../types').BuildingType }>,
): Record<string, PlotState> {
  if (buildingType === 'barn') return plots
  const updated = { ...plots }
  for (const [key, plot] of Object.entries(updated)) {
    if (plot.status !== 'growing' || !plot.cropType || !plot.plantedAt) continue
    const [px, py] = key.split(',').map(Number)
    const affected =
      buildingType === 'windmill' ||
      (buildingType === 'greenhouse' && tileDistance(bx, by, px, py) <= 1)
    if (!affected) continue
    updated[key] = {
      ...plot,
      harvestableAt: computeHarvestableAt(px, py, plot.cropType, plot.plantedAt, season, newBuildings),
    }
  }
  return updated
}

function createInitialGrid(): TileData[][] {
  return Array.from({ length: GRID_SIZE }, (_, y) =>
    Array.from({ length: GRID_SIZE }, (_, x) => {
      const inCenter = x >= 3 && x <= 5 && y >= 3 && y <= 5
      return { x, y, type: inCenter ? ('unlocked' as const) : ('locked' as const) }
    })
  )
}

function createInitialInventory(): Record<InventoryItem, number[]> {
  return { wheat: [], corn: [], pumpkin: [], compost: [] }
}

function createInitialSoldCounts(): Record<CropType, number> {
  return { wheat: 0, corn: 0, pumpkin: 0 }
}

export interface GameState {
  grid: TileData[][]
  plots: Record<string, PlotState>
  buildings: Record<string, BuildingData>
  balance: number
  inventory: Record<InventoryItem, number[]>
  selectedTile: { x: number; y: number } | null
  selectedTiles: { x: number; y: number }[]
  buildingMenuTile: { x: number; y: number } | null
  marketOpen: boolean
  tooltip: TooltipData | null
  marketPrices: Record<CropType, number>
  priceHistories: Record<CropType, number[]>
  lastMarketEvent: MarketEvent | null
  lastSpoilEvent: { cropType: CropType; firedAt: number } | null
  lastInventoryExpireEvent: { cropType: CropType; count: number; firedAt: number } | null
  currentSeason: Season
  seasonStartedAt: number
  seasonSoldCounts: Record<CropType, number>
}

export interface GameActions {
  plantCrop: (x: number, y: number, cropType: CropType) => void
  plantCropMulti: (tiles: { x: number; y: number }[], cropType: CropType) => void
  harvestPlot: (x: number, y: number) => void
  harvestMulti: (tiles: { x: number; y: number }[]) => void
  buyLand: (x: number, y: number) => void
  sellCrop: (cropType: CropType, amount: number) => void
  placeBuilding: (x: number, y: number, type: import('../types').BuildingType) => void
  sellBuilding: (x: number, y: number) => void
  tickCrops: () => void
  updateMarketPrices: (prices: Record<CropType, number>, histories: Record<CropType, number[]>, event: MarketEvent | null) => void
  updateSeason: (season: Season, startedAt: number) => void
  setSelectedTile: (pos: { x: number; y: number } | null) => void
  setSelectedTiles: (tiles: { x: number; y: number }[]) => void
  setBuildingMenuTile: (pos: { x: number; y: number } | null) => void
  setTooltip: (tooltip: TooltipData | null) => void
  toggleMarket: () => void
  loadGame: () => void
  resetGame: () => void
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
    seasonSoldCounts: state.seasonSoldCounts,
  })
}

const initialPrices = marketPriceEngine.getAllPrices()
const initialHistories = marketPriceEngine.getAllHistories()

/**
 * Migrate saved inventory from the old format (Record<InventoryItem, number>)
 * to the new per-unit timestamp format (Record<InventoryItem, number[]>).
 * Loaded items get a timestamp of now, giving them the full 15 min before expiry.
 */
function migrateInventory(raw: Record<string, unknown>): Record<InventoryItem, number[]> {
  const now = Date.now()
  const result: Record<InventoryItem, number[]> = { wheat: [], corn: [], pumpkin: [], compost: [] }
  for (const key of Object.keys(result) as InventoryItem[]) {
    const val = raw[key]
    if (Array.isArray(val)) {
      result[key] = val as number[]
    } else if (typeof val === 'number' && val > 0) {
      // Old format: number → create that many units all timestamped now
      result[key] = Array.from({ length: val }, () => now)
    }
  }
  return result
}

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
  lastSpoilEvent: null,
  lastInventoryExpireEvent: null,
  currentSeason: 'spring' as Season,
  seasonStartedAt: Date.now(),
  seasonSoldCounts: createInitialSoldCounts(),

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

    const now = Date.now()
    const compostUnits = s.inventory.compost ?? []
    const useCompost = compostUnits.length > 0
    const compostMod = useCompost ? COMPOST_GROWTH_MOD : 1
    const newInventory = { ...s.inventory }
    if (useCompost) newInventory.compost = compostUnits.slice(1) // consume 1 compost

    const newPlots: Record<string, PlotState> = {
      ...s.plots,
      [key]: {
        cropType,
        plantedAt: now,
        harvestableAt: computeHarvestableAt(x, y, cropType, now, s.currentSeason, s.buildings, compostMod),
        spoilsAt: null,
        status: 'growing',
      },
    }

    const next: GameState = {
      ...s,
      grid: gridWithRoads,
      plots: newPlots,
      balance: s.balance - cropDef.seedCost,
      inventory: newInventory,
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
    const compostUnits = s.inventory.compost ?? []
    let compostUsed = 0

    for (const { x, y } of validTiles) {
      const key = `${x},${y}`
      newGrid[y][x] = { x, y, type: 'plot' }
      const useCompost = compostUsed < compostUnits.length
      if (useCompost) compostUsed++
      const compostMod = useCompost ? COMPOST_GROWTH_MOD : 1
      newPlots[key] = {
        cropType,
        plantedAt: now,
        harvestableAt: computeHarvestableAt(x, y, cropType, now, s.currentSeason, s.buildings, compostMod),
        spoilsAt: null,
        status: 'growing',
      }
    }

    const next: GameState = {
      ...s,
      grid: newGrid,
      plots: newPlots,
      balance: s.balance - totalCost,
      inventory: { ...s.inventory, compost: compostUnits.slice(compostUsed) },
      selectedTiles: [],
    }
    set(next)
    persist(next)
  },

  harvestPlot: (x, y) => {
    const s = get()
    const key = `${x},${y}`
    const plot = s.plots[key]
    const now = Date.now()

    const emptyPlot: PlotState = { cropType: null, plantedAt: null, harvestableAt: null, spoilsAt: null, status: 'empty' as const }

    // Spoiled plot: compost already credited in tickCrops, just clear the tile
    if (plot?.status === 'spoiled') {
      const next: GameState = { ...s, plots: { ...s.plots, [key]: emptyPlot }, selectedTile: null }
      set(next)
      persist(next)
      return
    }

    const isReady =
      plot?.status === 'harvestable' ||
      (plot?.status === 'growing' && plot.harvestableAt != null && now >= plot.harvestableAt)
    if (!isReady || !plot?.cropType) return

    const newInventory = { ...s.inventory, [plot.cropType]: [...(s.inventory[plot.cropType] ?? []), now] }
    const newPlots = { ...s.plots, [key]: emptyPlot }

    const next: GameState = { ...s, plots: newPlots, inventory: newInventory, selectedTile: null }
    set(next)
    persist(next)
  },

  harvestMulti: (tiles) => {
    const s = get()
    const newInventory = { ...s.inventory }
    const newPlots = { ...s.plots }
    const now = Date.now()
    const emptyPlot: PlotState = { cropType: null, plantedAt: null, harvestableAt: null, spoilsAt: null, status: 'empty' as const }

    for (const { x, y } of tiles) {
      const key = `${x},${y}`
      const plot = s.plots[key]

      if (plot?.status === 'spoiled') {
        // Compost already credited; just clear the tile
        newPlots[key] = emptyPlot
        continue
      }

      const isReady =
        plot?.status === 'harvestable' ||
        (plot?.status === 'growing' && plot.harvestableAt != null && now >= plot.harvestableAt)
      if (!isReady || !plot?.cropType) continue
      newInventory[plot.cropType] = [...(newInventory[plot.cropType] ?? []), now]
      newPlots[key] = emptyPlot
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
    const units = s.inventory[cropType] ?? []
    const toSell = Math.min(amount, units.length)
    if (toSell <= 0) return

    const livePrice = s.marketPrices[cropType] ?? CropManager.getCropDefinition(cropType).sellPrice
    const barnBonus = Object.values(s.buildings).some(b => b.type === 'barn') ? BARN_BONUS : 1
    const supplyMod = getSupplyPressureMod(s.seasonSoldCounts[cropType] ?? 0, cropType)
    const effectivePrice = Math.round(livePrice * barnBonus * supplyMod)
    const newInventory = { ...s.inventory, [cropType]: units.slice(toSell) } // remove oldest (FIFO)
    const newSoldCounts = { ...s.seasonSoldCounts, [cropType]: (s.seasonSoldCounts[cropType] ?? 0) + toSell }
    const next: GameState = {
      ...s,
      inventory: newInventory,
      balance: s.balance + toSell * effectivePrice,
      seasonSoldCounts: newSoldCounts,
    }
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

    const updatedPlots = refreshHarvestableAt(
      newPlots, type, x, y, s.currentSeason,
      newBuildings as Record<string, { type: import('../types').BuildingType }>,
    )

    const next: GameState = {
      ...s,
      grid: gridWithRoads,
      plots: updatedPlots,
      buildings: newBuildings,
      balance: s.balance - def.cost,
      buildingMenuTile: null,
    }
    set(next)
    persist(next)
  },

  sellBuilding: (x, y) => {
    const s = get()
    const key = `${x},${y}`
    const building = s.buildings[key]
    if (!building || s.grid[y][x].type !== 'building') return

    const refund = BUILDING_DEFS[building.type].cost
    const newBuildings = { ...s.buildings }
    delete newBuildings[key]

    const newGrid = s.grid.map(row => row.map(t => ({ ...t })))
    newGrid[y][x] = { x, y, type: 'unlocked' }

    const updatedPlots = refreshHarvestableAt(
      s.plots, building.type, x, y, s.currentSeason,
      newBuildings as Record<string, { type: import('../types').BuildingType }>,
    )

    const next: GameState = {
      ...s,
      grid: newGrid,
      plots: updatedPlots,
      buildings: newBuildings,
      balance: s.balance + refund,
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
    const newCompostUnits = [...(s.inventory.compost ?? [])]
    let latestSpoilEvent = s.lastSpoilEvent
    let latestInventoryExpireEvent = s.lastInventoryExpireEvent

    // --- Field spoilage pass ---
    for (const [key, plot] of Object.entries(newPlots)) {
      if (plot.status === 'growing' && plot.cropType && plot.plantedAt) {
        const isReady = plot.harvestableAt != null
          ? now >= plot.harvestableAt
          : (() => {
              const [x, y] = key.split(',').map(Number)
              const def = CropManager.getCropDefinition(plot.cropType!)
              const seasonMod = SEASON_CONFIGS[s.currentSeason].growthMod[plot.cropType!]
              const seasonAdjusted = getAdjustedGrowDuration(def.growDuration, plot.cropType!, s.currentSeason)
              const effectiveDuration = getEffectiveGrowDuration(
                seasonAdjusted, plot.cropType!, x, y,
                s.buildings as Record<string, { type: import('../types').BuildingType }>,
                seasonMod, def.growDuration
              )
              return now - plot.plantedAt! >= effectiveDuration
            })()
        if (isReady) {
          const harvestableAt = plot.harvestableAt ?? now
          newPlots[key] = { ...plot, status: 'harvestable', spoilsAt: harvestableAt + SPOIL_DURATION_MS }
          changed = true
        }
      } else if (plot.status === 'harvestable' && plot.cropType && plot.spoilsAt != null && now >= plot.spoilsAt) {
        newCompostUnits.push(now) // field-spoiled crop yields 1 compost unit
        latestSpoilEvent = { cropType: plot.cropType, firedAt: now }
        newPlots[key] = { ...plot, status: 'spoiled', plantedAt: null, harvestableAt: null, spoilsAt: null }
        changed = true
      }
    }

    // --- Inventory expiry pass ---
    const newInventory = { ...s.inventory, compost: newCompostUnits }
    for (const cropType of CropManager.getAllCrops().map(c => c.type)) {
      const units = newInventory[cropType] ?? []
      const fresh = units.filter((ts: number) => now - ts < INVENTORY_SPOIL_MS)
      const expired = units.length - fresh.length
      if (expired > 0) {
        newInventory[cropType] = fresh
        latestInventoryExpireEvent = { cropType, count: expired, firedAt: now }
        changed = true
      }
    }

    if (changed) {
      const next: GameState = {
        ...s,
        plots: newPlots,
        inventory: newInventory,
        lastSpoilEvent: latestSpoilEvent,
        lastInventoryExpireEvent: latestInventoryExpireEvent,
      }
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
    // Recalculate harvestableAt for all growing crops under the new season's growth mod
    const updatedPlots = { ...s.plots }
    for (const [key, plot] of Object.entries(updatedPlots)) {
      if (plot.status !== 'growing' || !plot.cropType || !plot.plantedAt) continue
      const [x, y] = key.split(',').map(Number)
      updatedPlots[key] = {
        ...plot,
        harvestableAt: computeHarvestableAt(
          x, y, plot.cropType, plot.plantedAt, season,
          s.buildings as Record<string, { type: import('../types').BuildingType }>,
        ),
      }
    }
    const next: GameState = {
      ...s,
      currentSeason: season,
      seasonStartedAt: startedAt,
      plots: updatedPlots,
      seasonSoldCounts: createInitialSoldCounts(), // reset supply pressure each season
    }
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

    const season = saved.currentSeason ?? 'spring'
    const buildings = saved.buildings ?? {}

    // Migrate old saves: compute harvestableAt for growing plots that don't have it
    const plots: Record<string, PlotState> = {}
    for (const [key, plot] of Object.entries(saved.plots ?? {})) {
      if (plot.status === 'growing' && plot.cropType && plot.plantedAt && plot.harvestableAt == null) {
        const [px, py] = key.split(',').map(Number)
        plots[key] = {
          ...plot,
          spoilsAt: plot.spoilsAt ?? null,
          harvestableAt: computeHarvestableAt(
            px, py, plot.cropType, plot.plantedAt, season,
            buildings as Record<string, { type: import('../types').BuildingType }>,
          ),
        }
      } else {
        plots[key] = { ...plot, spoilsAt: plot.spoilsAt ?? null }
      }
    }

    set({
      grid,
      plots,
      buildings,
      balance: saved.balance ?? STARTING_BALANCE,
      inventory: migrateInventory(saved.inventory ?? {}),
      marketPrices: saved.marketPrices ?? marketPriceEngine.getAllPrices(),
      priceHistories: saved.priceHistories ?? marketPriceEngine.getAllHistories(),
      lastMarketEvent: saved.lastMarketEvent ?? null,
      lastSpoilEvent: null,
      lastInventoryExpireEvent: null,
      currentSeason: season,
      seasonStartedAt: saved.seasonStartedAt ?? Date.now(),
      seasonSoldCounts: saved.seasonSoldCounts ?? createInitialSoldCounts(),
    })
  },

  resetGame: () => {
    SaveManager.clear()
    set({
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
      lastSpoilEvent: null,
      lastInventoryExpireEvent: null,
      currentSeason: 'spring' as Season,
      seasonStartedAt: Date.now(),
      seasonSoldCounts: createInitialSoldCounts(),
    })
  },
}))
