import type { TileData } from '../types'

const GRID_SIZE = 15
const CENTER = Math.floor(GRID_SIZE / 2) // 7
const BASE_COST = 80
const COST_EXPONENT = 1.9

export const LandExpansionManager = {
  getLandCost: (x: number, y: number): number => {
    const dist = Math.abs(x - CENTER) + Math.abs(y - CENTER)
    return Math.round(BASE_COST * Math.pow(COST_EXPONENT, dist))
  },

  isAdjacentToUnlocked: (grid: TileData[][], x: number, y: number): boolean => {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (grid[ny][nx].type !== 'locked') return true
      }
    }
    return false
  },
}
