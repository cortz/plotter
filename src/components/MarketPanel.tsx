import { useGameStore } from '../store/gameStore'
import { CropManager } from '../modules/CropManager'
import type { CropType } from '../types'

export function MarketPanel() {
  const marketOpen = useGameStore(s => s.marketOpen)
  const toggleMarket = useGameStore(s => s.toggleMarket)
  const balance = useGameStore(s => s.balance)
  const inventory = useGameStore(s => s.inventory)
  const marketPrices = useGameStore(s => s.marketPrices)
  const priceHistories = useGameStore(s => s.priceHistories)
  const lastMarketEvent = useGameStore(s => s.lastMarketEvent)
  const sellCrop = useGameStore(s => s.sellCrop)

  if (!marketOpen) return null

  const crops = CropManager.getAllCrops()

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 320,
      background: 'rgba(18,10,3,0.95)',
      backdropFilter: 'blur(10px)',
      borderLeft: '2px solid rgba(200,160,60,0.35)',
      color: '#f5e6c8',
      fontFamily: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20,
      boxShadow: '-4px 0 24px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(200,160,60,0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>📈 Crop Market</h2>
          <div style={{ fontSize: 12, color: '#a89070', marginTop: 2 }}>Prices update every 30s</div>
        </div>
        <button onClick={toggleMarket} style={closeBtnStyle}>✕</button>
      </div>

      {/* Balance */}
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid rgba(200,160,60,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 15,
        flexShrink: 0,
      }}>
        <span>💰 Balance:</span>
        <strong style={{ fontSize: 17, color: '#ffd700' }}>{balance}</strong>
      </div>

      {/* Last event banner */}
      {lastMarketEvent && (
        <div style={{
          margin: '8px 12px 0',
          padding: '8px 12px',
          borderRadius: 8,
          background: lastMarketEvent.multiplier >= 1
            ? 'rgba(30,80,30,0.6)'
            : 'rgba(80,20,20,0.6)',
          border: `1px solid ${lastMarketEvent.multiplier >= 1 ? 'rgba(80,180,80,0.4)' : 'rgba(180,60,60,0.4)'}`,
          fontSize: 12,
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, color: lastMarketEvent.multiplier >= 1 ? '#7dff7d' : '#ff7d7d' }}>
            📢 {lastMarketEvent.name}
          </span>
          <span style={{ color: '#a89070', marginLeft: 6 }}>{lastMarketEvent.description}</span>
        </div>
      )}

      {/* Crop price cards — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {crops.map(crop => {
          const ct = crop.type as CropType
          const count = inventory[ct] ?? 0
          const price = marketPrices[ct] ?? crop.sellPrice
          const history = priceHistories[ct] ?? [price]
          const prev = history.length >= 2 ? history[history.length - 2] : price
          const pctChange = prev > 0 ? ((price - prev) / prev) * 100 : 0
          const trending = price >= prev
          const allHigh = Math.max(...history)
          const allLow = Math.min(...history)
          const revenue = count * price

          return (
            <div key={ct} style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid rgba(200,160,60,0.2)`,
              borderRadius: 10,
              padding: '12px 14px',
            }}>
              {/* Crop name + price row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{crop.emoji} {crop.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: trending ? '#6dcc6d' : '#cc6d6d',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: trending ? 'rgba(80,180,80,0.15)' : 'rgba(180,60,60,0.15)',
                  }}>
                    {trending ? '▲' : '▼'} {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#ffd700' }}>
                    {price} 💰
                  </span>
                </div>
              </div>

              {/* Sparkline */}
              <Sparkline history={history} trending={trending} />

              {/* Hi/Lo + inventory */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: '#806050',
                margin: '6px 0 8px',
              }}>
                <span>▲ High: <span style={{ color: '#aaa' }}>{Math.round(allHigh)}</span></span>
                <span>▼ Low: <span style={{ color: '#aaa' }}>{Math.round(allLow)}</span></span>
                <span>Barn: <span style={{ color: count > 0 ? '#ffd700' : '#666' }}>{count}</span></span>
              </div>

              {/* Sell buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionButton
                  label="Sell 1"
                  disabled={count < 1}
                  onClick={() => sellCrop(ct, 1)}
                />
                <ActionButton
                  label={`Sell All  (+${revenue} 💰)`}
                  disabled={count < 1}
                  onClick={() => sellCrop(ct, count)}
                  primary
                />
              </div>
            </div>
          )
        })}

        {/* Seed price reference */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 2 }}>
          <div style={{ fontSize: 12, color: '#7a6050', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Seed costs
          </div>
          {crops.map(crop => (
            <div key={crop.type} style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              padding: '4px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{ color: '#c8b090' }}>{crop.emoji} {crop.name}</span>
              <span style={{ color: '#7a6050' }}>
                {crop.seedCost} 💰 seed · {formatDuration(crop.growDuration)} grow
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Sparkline SVG ---
function Sparkline({ history, trending }: { history: number[]; trending: boolean }) {
  const W = 280, H = 48, PAD = 2
  if (history.length < 2) {
    return <div style={{ height: H, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }} />
  }

  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1

  const pts = history.map((v, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const color = trending ? '#6dcc6d' : '#cc6d6d'

  return (
    <svg
      width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Fill area under line */}
      <defs>
        <linearGradient id={`grad-${trending}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`${pts[0]} ${pts.join(' ')} ${(W - PAD).toFixed(1)},${H} ${PAD},${H}`}
        fill={`url(#grad-${trending})`}
      />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Latest dot */}
      {(() => {
        const last = pts[pts.length - 1].split(',').map(Number)
        return <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
      })()}
    </svg>
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
        padding: '6px 8px',
        borderRadius: 6,
        border: primary ? '1px solid #c8903a' : '1px solid rgba(200,160,60,0.25)',
        background: disabled ? 'rgba(255,255,255,0.03)' : primary ? '#7a4e2a' : 'rgba(255,255,255,0.08)',
        color: disabled ? '#444' : '#f5e6c8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontFamily: 'inherit',
        fontWeight: primary ? 700 : 400,
        whiteSpace: 'nowrap',
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

