import type { CropDefinition, CropType } from '../types'

export const SPOIL_DURATION_MS = 5 * 60 * 1000  // 5 minutes after harvestable
export const COMPOST_GROWTH_MOD = 0.80           // 20% faster growth per compost unit

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
