import { useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import { CropManager } from '../modules/CropManager'
import { getAdjustedGrowDuration, getBestCropsForSeason, SEASON_CONFIGS } from '../modules/SeasonManager'
import { useEscapeKey } from '../hooks/useEscapeKey'
import type { CropType } from '../types'

export function MultiPlantingMenu() {
  const selectedTiles = useGameStore(s => s.selectedTiles)
  const balance = useGameStore(s => s.balance)
  const currentSeason = useGameStore(s => s.currentSeason)
  const setSelectedTiles = useGameStore(s => s.setSelectedTiles)
  const plantCropMulti = useGameStore(s => s.plantCropMulti)
  const grid = useGameStore(s => s.grid)
  const plots = useGameStore(s => s.plots)

  const close = useCallback(() => setSelectedTiles([]), [setSelectedTiles])
  useEscapeKey(close)

  if (selectedTiles.length === 0) return null

  // Filter to valid plantable tiles (unlocked or empty plot)
  const validTiles = selectedTiles.filter(({ x, y }) => {
    const tile = grid[y]?.[x]
    if (!tile) return false
    const key = `${x},${y}`
    const plot = plots[key]
    return tile.type === 'unlocked' || (tile.type === 'plot' && (!plot || plot.status === 'empty'))
  })

  const crops = CropManager.getAllCrops()
  const bestCrops = getBestCropsForSeason(currentSeason)
  const seasonConfig = SEASON_CONFIGS[currentSeason]
  const count = validTiles.length

  const handlePlant = (cropType: CropType) => {
    plantCropMulti(validTiles, cropType)
    // selectedTiles is cleared by plantCropMulti internally
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && close()}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        zIndex: 30,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        background: 'rgba(14,10,4,0.97)',
        border: '2px solid rgba(100,160,255,0.5)',
        borderRadius: 14,
        padding: '24px 28px',
        minWidth: 340,
        maxWidth: 420,
        color: '#f5e6c8',
        fontFamily: 'inherit',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>🌱 Plant a Crop</h2>
          <button
            onClick={close}
            style={{ background: 'none', border: 'none', color: '#f5e6c8', fontSize: 18, cursor: 'pointer' }}
          >✕</button>
        </div>

        {/* Tile selection summary */}
        <div style={{
          fontSize: 13,
          color: '#7ab4ff',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            background: 'rgba(0,85,255,0.2)',
            border: '1px solid rgba(100,160,255,0.4)',
            borderRadius: 6,
            padding: '2px 8px',
            fontWeight: 700,
          }}>
            {count} tile{count !== 1 ? 's' : ''} selected
          </span>
          {selectedTiles.length !== count && (
            <span style={{ color: '#888', fontSize: 12 }}>
              ({selectedTiles.length - count} invalid skipped)
            </span>
          )}
        </div>

        <div style={{ fontSize: 13, color: '#c8a96e', marginBottom: 16 }}>
          Balance: <strong style={{ color: '#ffd700' }}>{balance} 💰</strong>
        </div>

        {count === 0 ? (
          <div style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
            No plantable tiles in selection
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {crops.map(crop => {
              const totalCost = crop.seedCost * count
              const canAfford = balance >= totalCost
              const adjDuration = getAdjustedGrowDuration(crop.growDuration, crop.type, currentSeason)
              const isBest = bestCrops[0] === crop.type
              const growthMod = seasonConfig.growthMod[crop.type]
              const modLabel = growthMod < 1
                ? `⚡ ${Math.round((1 - growthMod) * 100)}% faster`
                : growthMod > 1
                ? `🐢 ${Math.round((growthMod - 1) * 100)}% slower`
                : null

              return (
                <button
                  key={crop.type}
                  disabled={!canAfford}
                  onClick={() => handlePlant(crop.type as CropType)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 10, position: 'relative',
                    border: isBest && canAfford
                      ? '1px solid rgba(255,215,0,0.6)'
                      : canAfford
                      ? '1px solid rgba(200,160,60,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: canAfford ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    color: canAfford ? '#f5e6c8' : '#555',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => canAfford && ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,160,60,0.15)')}
                  onMouseLeave={e => canAfford && ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)')}
                >
                  {isBest && (
                    <span style={{
                      position: 'absolute', top: -8, right: 10,
                      background: 'rgba(255,215,0,0.9)', color: '#222',
                      fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                    }}>🌟 Best this season</span>
                  )}
                  <span style={{ fontSize: 26 }}>{crop.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{crop.name}</div>
                    <div style={{ fontSize: 12, color: canAfford ? '#a89070' : '#444', marginTop: 2 }}>
                      {crop.seedCost} × {count} = <strong style={{ color: canAfford ? '#ffd700' : '#555' }}>{totalCost} 💰</strong>
                      {' · '}{formatDuration(adjDuration)}
                      {modLabel && <span style={{ marginLeft: 4, color: growthMod < 1 ? '#6ef080' : '#f0a060' }}>{modLabel}</span>}
                    </div>
                  </div>
                  {!canAfford && (
                    <span style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
                      Need {totalCost - balance} more
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`
  return `${s}s`
}
