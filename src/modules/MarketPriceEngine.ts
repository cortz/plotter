import type { CropType, MarketEvent } from '../types'
import { CropManager } from './CropManager'

// Per-crop volatility (standard deviation of price change per tick)
const VOLATILITY: Record<CropType, number> = {
  wheat: 0.13,   // most volatile — grows fastest
  corn: 0.085,
  pumpkin: 0.05, // least volatile — grows slowest
}

const MEAN_REVERSION_STRENGTH = 0.08 // how hard prices pull toward base price
const HISTORY_LENGTH = 24             // data points to keep
const PRICE_FLOOR_RATIO = 0.2         // floor = 20% of base
const PRICE_CEIL_RATIO = 3.0          // ceiling = 300% of base
const EVENT_CHANCE_PER_TICK = 0.07    // ~7% chance per tick

// Market event catalogue — each is crop-specific with a price multiplier
const EVENT_CATALOGUE: Omit<MarketEvent, 'firedAt'>[] = [
  { name: 'Wheat Blight', description: 'A fungal blight hits wheat fields across the region.', cropType: 'wheat', multiplier: 0.62 },
  { name: 'Wheat Boom', description: 'Export demand for wheat surges overnight.', cropType: 'wheat', multiplier: 1.48 },
  { name: 'Harvest Festival', description: 'The annual harvest festival drives up wheat demand.', cropType: 'wheat', multiplier: 1.35 },
  { name: 'Wheat Glut', description: 'Overproduction causes wheat prices to collapse.', cropType: 'wheat', multiplier: 0.55 },
  { name: 'Corn Drought', description: 'A severe drought devastates corn crops.', cropType: 'corn', multiplier: 1.55 },
  { name: 'Corn Surplus', description: 'Record corn yields flood the market.', cropType: 'corn', multiplier: 0.60 },
  { name: 'Ethanol Rush', description: 'Fuel producers are buying corn in bulk.', cropType: 'corn', multiplier: 1.42 },
  { name: 'Corn Pest', description: 'Corn borers devastate regional supply.', cropType: 'corn', multiplier: 1.38 },
  { name: 'Pumpkin Craze', description: 'Pumpkin spice mania grips the nation.', cropType: 'pumpkin', multiplier: 1.65 },
  { name: 'Pumpkin Glut', description: 'Post-Halloween pumpkin surplus crashes prices.', cropType: 'pumpkin', multiplier: 0.50 },
  { name: 'Pumpkin Blight', description: 'A rot spreads through pumpkin patches everywhere.', cropType: 'pumpkin', multiplier: 1.52 },
  { name: 'Pumpkin Fad Ends', description: 'Pumpkin hype fades — buyers disappear.', cropType: 'pumpkin', multiplier: 0.68 },
]

export interface MarketTickResult {
  prices: Record<CropType, number>
  histories: Record<CropType, number[]>
  event: MarketEvent | null
}

type TickHandler = (result: MarketTickResult) => void

export class MarketPriceEngine {
  private prices: Record<CropType, number>
  private histories: Record<CropType, number[]>
  private subscribers: TickHandler[] = []

  constructor() {
    const crops = CropManager.getAllCrops()
    this.prices = {} as Record<CropType, number>
    this.histories = {} as Record<CropType, number[]>
    for (const crop of crops) {
      this.prices[crop.type] = crop.sellPrice
      this.histories[crop.type] = [crop.sellPrice]
    }
  }

  getCurrentPrice(cropType: CropType): number {
    return Math.round(this.prices[cropType])
  }

  getPriceHistory(cropType: CropType): number[] {
    return [...this.histories[cropType]]
  }

  getAllPrices(): Record<CropType, number> {
    const result = {} as Record<CropType, number>
    for (const ct of Object.keys(this.prices) as CropType[]) {
      result[ct] = Math.round(this.prices[ct])
    }
    return result
  }

  getAllHistories(): Record<CropType, number[]> {
    const result = {} as Record<CropType, number[]>
    for (const ct of Object.keys(this.histories) as CropType[]) {
      result[ct] = [...this.histories[ct]]
    }
    return result
  }

  tick(priceModifiers?: Record<CropType, number>): MarketTickResult {
    const event = Math.random() < EVENT_CHANCE_PER_TICK ? this.fireRandomEvent() : null

    for (const crop of CropManager.getAllCrops()) {
      const ct = crop.type
      // Seasonal modifier shifts the mean-reversion target
      const seasonalMod = priceModifiers?.[ct] ?? 1
      const base = crop.sellPrice * seasonalMod
      const floor = crop.sellPrice * PRICE_FLOOR_RATIO
      const ceil = crop.sellPrice * PRICE_CEIL_RATIO
      const vol = VOLATILITY[ct]

      // Mean reversion drift toward the seasonally-adjusted base
      const drift = MEAN_REVERSION_STRENGTH * (base - this.prices[ct]) / base

      // Random noise (normal approximation via Box-Muller)
      const noise = gaussianRandom() * vol

      let newPrice = this.prices[ct] * (1 + drift + noise)
      newPrice = Math.max(floor, Math.min(ceil, newPrice))
      this.prices[ct] = newPrice

      // Append to history, trim to HISTORY_LENGTH
      this.histories[ct] = [...this.histories[ct], newPrice].slice(-HISTORY_LENGTH)
    }

    const result: MarketTickResult = {
      prices: this.getAllPrices(),
      histories: this.getAllHistories(),
      event,
    }

    this.subscribers.forEach(fn => fn(result))
    return result
  }

  private fireRandomEvent(): MarketEvent {
    const template = EVENT_CATALOGUE[Math.floor(Math.random() * EVENT_CATALOGUE.length)]
    const ct = template.cropType
    const base = CropManager.getCropDefinition(ct).sellPrice
    const floor = base * PRICE_FLOOR_RATIO
    const ceil = base * PRICE_CEIL_RATIO

    // Apply event multiplier with bounds
    this.prices[ct] = Math.max(floor, Math.min(ceil, this.prices[ct] * template.multiplier))

    return { ...template, firedAt: Date.now() }
  }

  subscribe(handler: TickHandler): () => void {
    this.subscribers.push(handler)
    return () => {
      this.subscribers = this.subscribers.filter(h => h !== handler)
    }
  }

  serialize(): { prices: Record<CropType, number>; histories: Record<CropType, number[]> } {
    return {
      prices: { ...this.prices },
      histories: this.getAllHistories(),
    }
  }

  deserialize(data: { prices: Record<CropType, number>; histories: Record<CropType, number[]> }) {
    for (const ct of Object.keys(data.prices) as CropType[]) {
      if (ct in this.prices) {
        this.prices[ct] = data.prices[ct]
        this.histories[ct] = data.histories[ct] ?? [data.prices[ct]]
      }
    }
  }
}

// Singleton instance
export const marketPriceEngine = new MarketPriceEngine()

// Box-Muller normal random (mean 0, std 1)
function gaussianRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}
