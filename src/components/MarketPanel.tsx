import { useGameStore } from '../store/gameStore'
import { CropManager } from '../modules/CropManager'
import type { CropType } from '../types'

export function MarketPanel() {
  const marketOpen = useGameStore(s => s.marketOpen)
  const toggleMarket = useGameStore(s => s.toggleMarket)
  const balance = useGameStore(s => s.balance)
  const inventory = useGameStore(s => s.inventory)
  const sellCrop = useGameStore(s => s.sellCrop)

  if (!marketOpen) return null

  const crops = CropManager.getAllCrops()

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 300,
      background: 'rgba(25,15,5,0.92)',
      backdropFilter: 'blur(8px)',
      borderLeft: '2px solid rgba(200,160,60,0.4)',
      color: '#f5e6c8',
      fontFamily: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20,
      boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(200,160,60,0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>🏪 Market</h2>
        <button onClick={toggleMarket} style={closeBtnStyle}>✕</button>
      </div>

      {/* Balance */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid rgba(200,160,60,0.2)',
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>💰 Balance:</span>
        <strong style={{ fontSize: 18, color: '#ffd700' }}>{balance}</strong>
      </div>

      {/* Sell crops */}
      <div style={{ padding: '12px 20px', flex: 1, overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#c8a96e', textTransform: 'uppercase', letterSpacing: 1 }}>
          Sell Crops
        </h3>

        {crops.map(crop => {
          const count = inventory[crop.type] ?? 0
          return (
            <div key={crop.type} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(200,160,60,0.2)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  {crop.emoji} {crop.name}
                </span>
                <span style={{ color: '#ffd700' }}>
                  {count} in barn
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#a89070' }}>
                Sell price: {crop.sellPrice} 💰 each
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionButton
                  label="Sell 1"
                  disabled={count < 1}
                  onClick={() => sellCrop(crop.type as CropType, 1)}
                />
                <ActionButton
                  label={`Sell All (${crop.sellPrice * count} 💰)`}
                  disabled={count < 1}
                  onClick={() => sellCrop(crop.type as CropType, count)}
                  primary
                />
              </div>
            </div>
          )
        })}

        {/* Seed costs reference */}
        <h3 style={{ margin: '16px 0 12px', fontSize: 15, color: '#c8a96e', textTransform: 'uppercase', letterSpacing: 1 }}>
          Seed Prices
        </h3>
        {crops.map(crop => (
          <div key={crop.type} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontSize: 14,
          }}>
            <span>{crop.emoji} {crop.name}</span>
            <span style={{ color: '#a89070' }}>
              {crop.seedCost} 💰 seed • {formatDuration(crop.growDuration)} grow • {crop.sellPrice} 💰 sell
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActionButton({ label, onClick, disabled, primary }: {
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '6px 10px',
        borderRadius: 6,
        border: primary ? '1px solid #c8903a' : '1px solid rgba(200,160,60,0.3)',
        background: disabled ? 'rgba(255,255,255,0.05)' : primary ? '#8B5E3C' : 'rgba(255,255,255,0.1)',
        color: disabled ? '#555' : '#f5e6c8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontFamily: 'inherit',
        fontWeight: primary ? 700 : 400,
      }}
    >
      {label}
    </button>
  )
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (m > 0) return s > 0 ? `${m}m${s}s` : `${m}m`
  return `${s}s`
}

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#f5e6c8',
  fontSize: 18,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 4,
  lineHeight: 1,
}
