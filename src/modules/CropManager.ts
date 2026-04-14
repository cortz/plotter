import type { CropDefinition, CropType } from '../types'

export const SPOIL_DURATION_MS = 5 * 60 * 1000    // 5 minutes after harvestable (field spoilage)
export const COMPOST_GROWTH_MOD = 0.80             // 20% faster growth per compost unit
export const INVENTORY_SPOIL_MS = 15 * 60 * 1000  // 15 minutes in inventory before expiry

/** Supply pressure scale per crop — lower = pressure kicks in faster */
export const SUPPLY_PRESSURE_SCALE: Record<CropType, number> = {
  wheat: 20,
  corn: 10,
  pumpkin: 5,
}
export const SUPPLY_PRESSURE_FLOOR = 0.35

/** Returns the sell-price multiplier based on how much of a crop was sold this season */
export function getSupplyPressureMod(soldCount: number, cropType: CropType): number {
  const scale = SUPPLY_PRESSURE_SCALE[cropType]
  return Math.max(SUPPLY_PRESSURE_FLOOR, 1 / (1 + soldCount / scale))
}

const CATALOGUE: Record<CropType, CropDefinition> = {
  wheat: {
    type: 'wheat',
    name: 'Wheat',
    emoji: '🌾',
    growDuration: 60_000, // 1 minute
    seedCost: 10,
    sellPrice: 20,
    color: 0xf5c542,
  },
  corn: {
    type: 'corn',
    name: 'Corn',
    emoji: '🌽',
    growDuration: 180_000, // 3 minutes
    seedCost: 20,
    sellPrice: 60,
    color: 0x78c832,
  },
  pumpkin: {
    type: 'pumpkin',
    name: 'Pumpkin',
    emoji: '🎃',
    growDuration: 480_000, // 8 minutes
    seedCost: 40,
    sellPrice: 150,
    color: 0xff7518,
  },
}

export const CropManager = {
  getCropDefinition: (type: CropType): CropDefinition => CATALOGUE[type],
  getAllCrops: (): CropDefinition[] => Object.values(CATALOGUE),
}
