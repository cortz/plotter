import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import { BUILDING_DEFS } from '../modules/BuildingManager'
import { CropManager } from '../modules/CropManager'
import { getAdjustedGrowDuration, getBestCropsForSeason, SEASON_CONFIGS } from '../modules/SeasonManager'
import { useEscapeKey } from '../hooks/useEscapeKey'
import type { BuildingType, CropType } from '../types'

type View = 'choose' | 'plant' | 'build'

export function BuildingMenu() {
  const buildingMenuTile = useGameStore(s => s.buildingMenuTile)
  const balance = useGameStore(s => s.balance)
  const currentSeason = useGameStore(s => s.currentSeason)
  const setBuildingMenuTile = useGameStore(s => s.setBuildingMenuTile)
  const setSelectedTile = useGameStore(s => s.setSelectedTile)
  const plantCrop = useGameStore(s => s.plantCrop)
  const placeBuilding = useGameStore(s => s.placeBuilding)
  const grid = useGameStore(s => s.grid)
  const plots = useGameStore(s => s.plots)

  const [view, setView] = useState<View>('choose')

  // Reset to choose view whenever a new tile is selected
  useEffect(() => {
    if (buildingMenuTile) setView('choose')
  }, [buildingMenuTile?.x, buildingMenuTile?.y])

  const close = useCallback(() => {
    setBuildingMenuTile(null)
    setSelectedTile(null)
    setView('choose')
  }, [setBuildingMenuTile, setSelectedTile])

  useEscapeKey(close)

  const tile = buildingMenuTile

  if (!tile) return null

  const tileType = grid[tile.y]?.[tile.x]?.type
  const plotState = plots[`${tile.x},${tile.y}`]
  const canBuild = tileType === 'unlocked' ||
    (tileType === 'plot' && (!plotState || plotState.status === 'empty'))

  const crops = CropManager.getAllCrops()
  const bestCrops = getBestCropsForSeason(currentSeason)
  const seasonConfig = SEASON_CONFIGS[currentSeason]

  const handlePlant = (cropType: CropType) => {
    plantCrop(tile.x, tile.y, cropType)
    close()
  }

  const handleBuild = (type: BuildingType) => {
    placeBuilding(tile.x, tile.y, type)
    close()
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
        border: '2px solid rgba(200,160,60,0.5)',
        borderRadius: 14,
        padding: '24px 28px',
        minWidth: 340,
        maxWidth: 420,
        color: '#f5e6c8',
        fontFamily: 'inherit',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            {view === 'choose' ? '🌿 What would you like to do?' : view === 'plant' ? '🌱 Plant a Crop' : '🏗️ Construct a Building'}
          </h2>
          <button onClick={close} style={{ background: 'none', border: 'none', color: '#f5e6c8', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ fontSize: 13, color: '#c8a96e', marginBottom: 16 }}>
          Balance: <strong style={{ color: '#ffd700' }}>{balance} 💰</strong>
        </div>

        {/* Back button */}
        {view !== 'choose' && (
          <button
            onClick={() => setView('choose')}
            style={{
              background: 'none', border: '1px solid rgba(200,160,60,0.3)',
              color: '#a89070', borderRadius: 8, padding: '4px 10px',
              fontSize: 12, cursor: 'pointer', marginBottom: 14, fontFamily: 'inherit',
            }}
          >← Back</button>
        )}

        {/* Choose view */}
        {view === 'choose' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <ActionCard
              emoji="🌱"
              title="Plant Crop"
              subtitle="Grow and harvest for coins"
              onClick={() => setView('plant')}
            />
            {canBuild && (
              <ActionCard
                emoji="🏗️"
                title="Construct"
                subtitle="Build a farm structure"
                onClick={() => setView('build')}
              />
            )}
          </div>
        )}

        {/* Plant view */}
        {view === 'plant' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {crops.map(crop => {
              const canAfford = balance >= crop.seedCost
              const adjDuration = getAdjustedGrowDuration(crop.growDuration, crop.type, currentSeason)
              const isBest = bestCrops[0] === crop.type
              const growthMod = seasonConfig.growthMod[crop.type]
              const modLabel = growthMod < 1 ? `⚡ ${Math.round((1 - growthMod) * 100)}% faster`
                : growthMod > 1 ? `🐢 ${Math.round((growthMod - 1) * 100)}% slower`
                : null
              return (
                <button
                  key={crop.type}
                  disabled={!canAfford}
                  onClick={() => handlePlant(crop.type as CropType)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 10, position: 'relative',
                    border: isBest && canAfford ? '1px solid rgba(255,215,0,0.6)' : canAfford ? '1px solid rgba(200,160,60,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: canAfford ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    color: canAfford ? '#f5e6c8' : '#555',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  {isBest && (
                    <span style={{ position: 'absolute', top: -8, right: 10, background: 'rgba(255,215,0,0.9)', color: '#222', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px' }}>
                      🌟 Best this season
                    </span>
                  )}
                  <span style={{ fontSize: 26 }}>{crop.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{crop.name}</div>
                    <div style={{ fontSize: 12, color: canAfford ? '#a89070' : '#444', marginTop: 2 }}>
                      Seed: {crop.seedCost} 💰 · {formatDuration(adjDuration)}
                      {modLabel && <span style={{ marginLeft: 4, color: growthMod < 1 ? '#6ef080' : '#f0a060' }}>{modLabel}</span>}
                    </div>
                  </div>
                  {!canAfford && <span style={{ fontSize: 12, color: '#666' }}>Need {crop.seedCost - balance} more</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Build view */}
        {view === 'build' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(Object.values(BUILDING_DEFS) as typeof BUILDING_DEFS[BuildingType][]).map(def => {
              const canAfford = balance >= def.cost
              return (
                <button
                  key={def.type}
                  disabled={!canAfford}
                  onClick={() => handleBuild(def.type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 10,
                    border: canAfford ? '1px solid rgba(200,160,60,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: canAfford ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    color: canAfford ? '#f5e6c8' : '#555',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{def.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{def.name}</div>
                    <div style={{ fontSize: 12, color: canAfford ? '#a89070' : '#444', marginTop: 2 }}>
                      {def.description}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: canAfford ? '#ffd700' : '#555', whiteSpace: 'nowrap' }}>
                    {def.cost} 💰
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionCard({ emoji, title, subtitle, onClick }: { emoji: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, padding: '18px 12px', borderRadius: 12,
        border: '1px solid rgba(200,160,60,0.4)',
        background: 'rgba(255,255,255,0.06)',
        color: '#f5e6c8', cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,160,60,0.15)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
    >
      <span style={{ fontSize: 32 }}>{emoji}</span>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#a89070', textAlign: 'center' }}>{subtitle}</div>
    </button>
  )
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`
  return `${s}s`
}
