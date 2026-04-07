import { useGameStore } from '../store/gameStore'
import { CropManager } from '../modules/CropManager'
import type { CropType } from '../types'

export function PlantingMenu() {
  const selectedTile = useGameStore(s => s.selectedTile)
  const balance = useGameStore(s => s.balance)
  const setSelectedTile = useGameStore(s => s.setSelectedTile)
  const plantCrop = useGameStore(s => s.plantCrop)

  if (!selectedTile) return null

  const crops = CropManager.getAllCrops()

  return (
    <div
      onClick={e => e.target === e.currentTarget && setSelectedTile(null)}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        zIndex: 30,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        background: 'rgba(20,12,5,0.96)',
        border: '2px solid rgba(200,160,60,0.5)',
        borderRadius: 14,
        padding: '24px 28px',
        minWidth: 320,
        color: '#f5e6c8',
        fontFamily: 'inherit',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>🌱 Plant a Crop</h2>
          <button
            onClick={() => setSelectedTile(null)}
            style={{ background: 'none', border: 'none', color: '#f5e6c8', fontSize: 18, cursor: 'pointer', padding: '2px 6px' }}
          >✕</button>
        </div>

        <div style={{ fontSize: 13, color: '#c8a96e', marginBottom: 14 }}>
          Balance: <strong style={{ color: '#ffd700' }}>{balance} 💰</strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {crops.map(crop => {
            const canAfford = balance >= crop.seedCost
            return (
              <button
                key={crop.type}
                disabled={!canAfford}
                onClick={() => plantCrop(selectedTile.x, selectedTile.y, crop.type as CropType)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: canAfford ? '1px solid rgba(200,160,60,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  background: canAfford ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  color: canAfford ? '#f5e6c8' : '#555',
                  cursor: canAfford ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => canAfford && ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,160,60,0.15)')}
                onMouseLeave={e => canAfford && ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)')}
              >
                <span style={{ fontSize: 28 }}>{crop.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{crop.name}</div>
                  <div style={{ fontSize: 12, color: canAfford ? '#a89070' : '#444', marginTop: 2 }}>
                    Seed: {crop.seedCost} 💰 · Grows in {formatDuration(crop.growDuration)} · Sells for {crop.sellPrice} 💰
                  </div>
                </div>
                {!canAfford && (
                  <span style={{ fontSize: 12, color: '#666' }}>Need {crop.seedCost - balance} more</span>
                )}
              </button>
            )
          })}
        </div>
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
