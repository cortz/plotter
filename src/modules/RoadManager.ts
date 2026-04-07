import type { TileData } from '../types'

const GRID_SIZE = 9

function getAdjacents(grid: TileData[][], x: number, y: number): TileData[] {
  const result: TileData[] = []
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nx = x + dx
    const ny = y + dy
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      result.push(grid[ny][nx])
    }
  }
  return result
}

/**
 * Recomputes road tiles: any unlocked (non-plot) tile adjacent to a plot becomes a road.
 * Roads that no longer border any plot revert to unlocked.
 */
export function recomputeRoads(grid: TileData[][]): TileData[][] {
  const next = grid.map(row => row.map(t => ({ ...t })))

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = next[y][x]
      if (tile.type !== 'unlocked' && tile.type !== 'road') continue

      const bordersPlot = getAdjacents(next, x, y).some(t => t.type === 'plot')

      if (bordersPlot) {
        next[y][x] = { ...tile, type: 'road' }
      } else if (tile.type === 'road') {
        next[y][x] = { ...tile, type: 'unlocked' }
      }
    }
  }

  return next
}
