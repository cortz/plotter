import { useEffect, useRef } from 'react'
import { SceneManager } from '../scene/SceneManager'
import { useGameStore } from '../store/gameStore'
import { CropManager } from '../modules/CropManager'
import { LandExpansionManager } from '../modules/LandExpansionManager'
import { marketPriceEngine } from '../modules/MarketPriceEngine'
import { SEASON_DURATION_MS, SEASONS, SeasonManager } from '../modules/SeasonManager'
import type { Season } from '../types'

function formatSeconds(ms: number): string {
  const s = Math.ceil(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SceneManager | null>(null)
  const prevHoverKey = useRef<string | null>(null)

  const grid = useGameStore(s => s.grid)
  const plots = useGameStore(s => s.plots)
  const setSelectedTile = useGameStore(s => s.setSelectedTile)
  const setTooltip = useGameStore(s => s.setTooltip)
  const harvestPlot = useGameStore(s => s.harvestPlot)
  const buyLand = useGameStore(s => s.buyLand)

  // Scene setup (runs once)
  useEffect(() => {
    if (!canvasRef.current) return
    const scene = new SceneManager(canvasRef.current)
    sceneRef.current = scene

    scene.onTileClick = (x, y) => {
      const state = useGameStore.getState()
      const tile = state.grid[y][x]
      const key = `${x},${y}`
      const plot = state.plots[key]

      if (tile.type === 'plot' && plot?.status === 'harvestable') {
        harvestPlot(x, y)
      } else if (tile.type === 'locked') {
        buyLand(x, y)
      } else if (tile.type === 'unlocked' || tile.type === 'road' ||
                 (tile.type === 'plot' && (!plot || plot.status === 'empty'))) {
        setSelectedTile({ x, y })
      }
    }

    scene.onTileHover = (x, y) => {
      const key = `${x},${y}`
      if (prevHoverKey.current && prevHoverKey.current !== key) {
        const [px, py] = prevHoverKey.current.split(',').map(Number)
        scene.unhighlightTile(px, py)
      }
      prevHoverKey.current = key
      scene.highlightTile(x, y)

      const state = useGameStore.getState()
      const tile = state.grid[y]?.[x]
      const plot = state.plots[key]
      let content = ''

      if (!tile) {
        setTooltip(null)
        return
      }

      if (tile.type === 'locked') {
        const canExpand = LandExpansionManager.isAdjacentToUnlocked(state.grid, x, y)
        if (canExpand) {
          const cost = LandExpansionManager.getLandCost(x, y)
          const canAfford = state.balance >= cost
          content = `🔒 Locked Land  •  Cost: ${cost} 💰${canAfford ? '\nClick to purchase!' : '\n(not enough coins)'}`
        } else {
          content = '🔒 Locked Land\n(not adjacent to your farm)'
        }
      } else if (tile.type === 'road') {
        content = '🛤️ Road'
      } else if (tile.type === 'unlocked') {
        content = '🌿 Empty Land\nClick to plant a crop'
      } else if (tile.type === 'plot') {
        if (!plot || plot.status === 'empty') {
          content = '🪵 Empty Plot\nClick to plant a crop'
        } else if (plot.status === 'growing' && plot.cropType && plot.plantedAt) {
          const def = CropManager.getCropDefinition(plot.cropType)
          const remaining = Math.max(0, def.growDuration - (Date.now() - plot.plantedAt))
          content = `${def.emoji} ${def.name} — Growing\n⏱ ${formatSeconds(remaining)} remaining`
        } else if (plot.status === 'harvestable' && plot.cropType) {
          const def = CropManager.getCropDefinition(plot.cropType)
          content = `${def.emoji} ${def.name} — Ready!\nClick to harvest ✨`
        }
      }

      setTooltip(content ? { content } : null)
    }

    scene.onHoverClear = () => {
      if (prevHoverKey.current) {
        const [px, py] = prevHoverKey.current.split(',').map(Number)
        scene.unhighlightTile(px, py)
        prevHoverKey.current = null
      }
      setTooltip(null)
    }

    scene.startLoop()

    // Crop growth + season ticker (every 1s)
    const cropTicker = setInterval(() => {
      const state = useGameStore.getState()
      state.tickCrops()

      // Check if current season has expired
      const { currentSeason, seasonStartedAt, updateSeason } = state
      if (Date.now() - seasonStartedAt >= SEASON_DURATION_MS) {
        const nextSeason = SEASONS[(SEASONS.indexOf(currentSeason) + 1) % SEASONS.length] as Season
        updateSeason(nextSeason, Date.now())
        sceneRef.current?.setSeason(nextSeason)
        sceneRef.current?.buildGrid(
          useGameStore.getState().grid,
          useGameStore.getState().plots
        )
      }
    }, 1000)

    // Market price ticker (every 30s)
    const marketTicker = setInterval(() => {
      const { currentSeason } = useGameStore.getState()
      const priceMods = SeasonManager.getPriceModifiers(currentSeason)
      const result = marketPriceEngine.tick(priceMods)
      useGameStore.getState().updateMarketPrices(result.prices, result.histories, result.event)
    }, 30_000)

    // Handle canvas resize
    const resizeObserver = new ResizeObserver(() => scene.resize())
    resizeObserver.observe(canvasRef.current)

    // Apply initial season visuals
    const initialSeason = useGameStore.getState().currentSeason
    scene.setSeason(initialSeason)

    return () => {
      scene.destroy()
      clearInterval(cropTicker)
      clearInterval(marketTicker)
      resizeObserver.disconnect()
    }
  }, [])

  // Rebuild scene whenever grid or plot states change
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.buildGrid(grid, plots)
    }
  }, [grid, plots])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
