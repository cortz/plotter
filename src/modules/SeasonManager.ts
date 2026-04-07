import type { Season, SeasonConfig, CropType } from '../types'

export const SEASON_DURATION_MS = 5 * 60 * 1000 // 5 minutes per season

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

export const SEASON_CONFIGS: Record<Season, SeasonConfig> = {
  spring: {
    emoji: '🌸',
    label: 'Spring',
    description: 'Wheat thrives. Mild temperatures, frequent rain.',
    growthMod: { wheat: 0.80, corn: 1.20, pumpkin: 1.00 },
    priceMod:  { wheat: 1.20, corn: 0.90, pumpkin: 0.80 },
    skyColor:       0x2a4a1a,
    ambientColor:   0xfff5e0,
    unlockedColor:  0x5aad3a,
    roadColor:      0xc8a96e,
  },
  summer: {
    emoji: '☀️',
    label: 'Summer',
    description: 'Corn grows fastest. Hot sun accelerates all growth.',
    growthMod: { wheat: 1.00, corn: 0.75, pumpkin: 1.10 },
    priceMod:  { wheat: 1.00, corn: 1.30, pumpkin: 0.90 },
    skyColor:       0x1a3a14,
    ambientColor:   0xfffbe8,
    unlockedColor:  0x3a8c2f,
    roadColor:      0xb89860,
  },
  autumn: {
    emoji: '🍂',
    label: 'Autumn',
    description: 'Pumpkin season! Cool air speeds up pumpkin growth.',
    growthMod: { wheat: 1.30, corn: 1.00, pumpkin: 0.65 },
    priceMod:  { wheat: 0.90, corn: 1.00, pumpkin: 1.60 },
    skyColor:       0x2a1e0a,
    ambientColor:   0xffddaa,
    unlockedColor:  0x7a5a20,
    roadColor:      0xa07848,
  },
  winter: {
    emoji: '❄️',
    label: 'Winter',
    description: 'All crops grow very slowly. Wheat is least affected.',
    growthMod: { wheat: 2.00, corn: 2.50, pumpkin: 3.00 },
    priceMod:  { wheat: 1.40, corn: 1.30, pumpkin: 0.70 },
    skyColor:       0x0e1520,
    ambientColor:   0xd0e8ff,
    unlockedColor:  0x7090a8,
    roadColor:      0x9898b0,
  },
}

export function getNextSeason(current: Season): Season {
  const idx = SEASONS.indexOf(current)
  return SEASONS[(idx + 1) % SEASONS.length]
}

export function getSeasonProgress(seasonStartedAt: number): number {
  const elapsed = Date.now() - seasonStartedAt
  return Math.min(1, elapsed / SEASON_DURATION_MS)
}

export function getAdjustedGrowDuration(baseDuration: number, cropType: CropType, season: Season): number {
  return baseDuration * SEASON_CONFIGS[season].growthMod[cropType]
}

/** Returns crop types ordered by best (fastest relative growth) for the given season */
export function getBestCropsForSeason(season: Season): CropType[] {
  const mods = SEASON_CONFIGS[season].growthMod
  return (Object.keys(mods) as CropType[]).sort((a, b) => mods[a] - mods[b])
}

export const SeasonManager = {
  getConfig: (season: Season): SeasonConfig => SEASON_CONFIGS[season],
  getNext: getNextSeason,
  getProgress: getSeasonProgress,
  getAdjustedGrowDuration,
  getBestCrops: getBestCropsForSeason,
  getPriceModifiers: (season: Season): Record<CropType, number> => SEASON_CONFIGS[season].priceMod,
}
