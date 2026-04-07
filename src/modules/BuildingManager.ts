import type { BuildingType, BuildingDefinition, CropType } from '../types'

export const BUILDING_DEFS: Record<BuildingType, BuildingDefinition> = {
  barn: {
    type: 'barn',
    name: 'Barn',
    emoji: '🌾',
    description: '+20% sell price for harvested crops within 3 tiles.',
    cost: 500,
    color: 0xc8603a,
  },
  greenhouse: {
    type: 'greenhouse',
    name: 'Greenhouse',
    emoji: '🌿',
    description: 'Adjacent plots ignore season growth penalties — crops never grow slower than normal.',
    cost: 800,
    color: 0x44aa66,
  },
  windmill: {
    type: 'windmill',
    name: 'Windmill',
    emoji: '💨',
    description: 'All crops on the farm grow 15% faster.',
    cost: 650,
    color: 0xd4c080,
  },
}

export const BARN_BONUS = 1.20      // +20% sell price
export const BARN_RADIUS = 3        // tiles (Chebyshev distance)
export const GREENHOUSE_GROWTH_FLOOR = 1.0  // season mod cannot exceed 1.0 for adjacent plots
export const WINDMILL_SPEED_BONUS = 0.85    // × grow duration (15% faster)

/** Chebyshev distance between two tile coords */
export function tileDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by))
}

/**
 * Returns true if any barn exists within BARN_RADIUS of (x, y).
 * buildings is keyed "x,y".
 */
export function hasBarnNearby(
  buildings: Record<string, { type: BuildingType }>,
  x: number,
  y: number,
): boolean {
  for (const [key, b] of Object.entries(buildings)) {
    if (b.type !== 'barn') continue
    const [bx, by] = key.split(',').map(Number)
    if (tileDistance(x, y, bx, by) <= BARN_RADIUS) return true
  }
  return false
}

/**
 * Returns true if any greenhouse is adjacent (distance ≤ 1) to (x, y).
 */
export function hasGreenhouseAdjacent(
  buildings: Record<string, { type: BuildingType }>,
  x: number,
  y: number,
): boolean {
  for (const [key, b] of Object.entries(buildings)) {
    if (b.type !== 'greenhouse') continue
    const [bx, by] = key.split(',').map(Number)
    if (tileDistance(x, y, bx, by) <= 1) return true
  }
  return false
}

/**
 * Returns true if any windmill exists anywhere on the farm.
 */
export function hasWindmill(buildings: Record<string, { type: BuildingType }>): boolean {
  return Object.values(buildings).some(b => b.type === 'windmill')
}

/**
 * Compute the effective grow duration for a plot at (x, y),
 * applying windmill and greenhouse modifiers.
 */
export function getEffectiveGrowDuration(
  baseDuration: number,
  _cropType: CropType,
  x: number,
  y: number,
  buildings: Record<string, { type: BuildingType }>,
  seasonMod: number,
  rawDuration: number,
): number {
  let duration = baseDuration

  // Greenhouse: if adjacent, cap the season growth penalty (mod cannot exceed 1.0)
  if (seasonMod > 1.0 && hasGreenhouseAdjacent(buildings, x, y)) {
    // Revert to unpenalised duration, then re-apply windmill if any
    duration = rawDuration
  }

  // Windmill: 15% faster for all plots
  if (hasWindmill(buildings)) {
    duration *= WINDMILL_SPEED_BONUS
  }

  return duration
}
