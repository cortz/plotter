import { useState } from 'react'
import { SEASON_CONFIGS, SEASONS } from '../modules/SeasonManager'
import { CropManager } from '../modules/CropManager'
import { BUILDING_DEFS } from '../modules/BuildingManager'
import type { BuildingType } from '../types'

export function HelpButton() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'basics' | 'market' | 'seasons' | 'buildings'>('basics')

  const crops = CropManager.getAllCrops()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="How to play"
        style={{
          pointerEvents: 'all',
          background: 'rgba(20,12,5,0.75)',
          color: '#f5e6c8',
          border: '1px solid rgba(200,160,60,0.4)',
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        ❓
      </button>

      {open && (
        <div
          onClick={e => e.target === e.currentTarget && setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 200,
          }}
        >
          <div style={{
            background: 'rgba(14,10,4,0.97)',
            border: '2px solid rgba(200,160,60,0.5)',
            borderRadius: 16,
            padding: '28px 32px',
            width: 480,
            maxWidth: '92vw',
            maxHeight: '85vh',
            overflowY: 'auto',
            color: '#f5e6c8',
            fontFamily: 'inherit',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>📖 How to Play</h2>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: '#f5e6c8', fontSize: 20, cursor: 'pointer' }}
              >✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
              {(['basics', 'market', 'seasons', 'buildings'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    minWidth: 80,
                    padding: '7px 0',
                    borderRadius: 8,
                    border: tab === t ? '2px solid rgba(200,160,60,0.8)' : '2px solid rgba(200,160,60,0.2)',
                    background: tab === t ? 'rgba(200,160,60,0.18)' : 'transparent',
                    color: tab === t ? '#ffd700' : '#a89070',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textTransform: 'capitalize',
                  }}
                >
                  {t === 'basics' ? '🌱 Basics' : t === 'market' ? '📈 Market' : t === 'seasons' ? '🌸 Seasons' : '🏗️ Buildings'}
                </button>
              ))}
            </div>

            {/* Basics tab */}
            {tab === 'basics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Section title="🗺️ Your Farm">
                  You start with a small patch of land. <strong>Click any locked grey tile</strong> to buy it and expand your farm. Land near your existing plots is cheaper.
                </Section>
                <Section title="🌾 Planting">
                  Click an empty green or brown tile to open the planting menu. Pick a crop, pay the seed cost, and watch it grow!
                </Section>
                <Section title="🚜 Harvesting">
                  When a crop turns <span style={{ color: '#ffd700', fontWeight: 700 }}>gold ✨</span>, it's ready. Click it to harvest and add it to your inventory.
                </Section>
                <Section title="💰 Selling">
                  Open the <strong>🏪 Market</strong> to sell your harvested crops for coins. Use coins to buy more seeds and land.
                </Section>
                <div style={{ background: 'rgba(200,160,60,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c8a96e' }}>
                  💡 <strong>Tip:</strong> Hold and drag the scene to pan the camera around your farm.
                </div>
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, color: '#c8a96e' }}>Crops at a glance:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {crops.map(c => (
                      <div key={c.type} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <span style={{ fontSize: 20 }}>{c.emoji}</span>
                        <div>
                          <strong>{c.name}</strong>
                          <span style={{ color: '#a89070', marginLeft: 8 }}>
                            Seed: {c.seedCost}💰 · Base grow: {formatDuration(c.growDuration)} · Sells for ~{c.sellPrice}💰
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Market tab */}
            {tab === 'market' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Section title="📊 Live Prices">
                  Crop prices change every <strong>30 seconds</strong> — just like a real stock market. The price shown is what you'll get per crop when you sell right now.
                </Section>
                <Section title="📈 Reading the Chart">
                  Each crop card shows a <strong>sparkline</strong> — a mini chart of recent price history. An upward line means the price is rising; a downward line means it's falling.
                </Section>
                <Section title="⏱️ When to Sell?">
                  Watch the trend before selling:
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.8 }}>
                    <li><strong>▲ Green arrow</strong> = price going up — consider waiting</li>
                    <li><strong>▼ Red arrow</strong> = price going down — might be time to sell</li>
                    <li>Prices always drift back toward a <em>base value</em> over time, so extreme highs and lows don't last forever</li>
                  </ul>
                </Section>
                <Section title="⚡ Market Events">
                  Random events (droughts, bumper harvests, festivals…) can cause sudden price spikes or drops. A banner will flash when an event hits — react fast!
                </Section>
                <div style={{ background: 'rgba(200,160,60,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c8a96e' }}>
                  💡 <strong>Strategy:</strong> Stockpile crops during a price dip and sell when the market recovers for maximum profit.
                </div>
              </div>
            )}

            {/* Seasons tab */}
            {tab === 'seasons' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Section title="🔄 The Cycle">
                  The world cycles through <strong>4 seasons</strong>, each lasting <strong>5 minutes</strong>. The season badge at the top of the screen shows the current season and a progress bar counting down.
                </Section>
                <Section title="🌱 Growth Speed">
                  Each season speeds up or slows down certain crops. Plan your planting around the season for faster harvests and bigger profits!
                </Section>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {SEASONS.map(season => {
                    const cfg = SEASON_CONFIGS[season]
                    return (
                      <div key={season} style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(200,160,60,0.2)',
                        borderRadius: 10,
                        padding: '12px 14px',
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                          {cfg.emoji} {cfg.label}
                        </div>
                        <div style={{ fontSize: 12, color: '#a89070', marginBottom: 8 }}>{cfg.description}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {crops.map(c => {
                            const mod = cfg.growthMod[c.type]
                            const isGood = mod < 1
                            const label = mod < 1 ? `⚡ ${Math.round((1 - mod) * 100)}% faster`
                              : mod > 1 ? `🐢 ${Math.round((mod - 1) * 100)}% slower`
                              : '→ Normal'
                            return (
                              <span key={c.type} style={{
                                fontSize: 11,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: isGood ? 'rgba(100,230,120,0.12)' : mod > 1 ? 'rgba(230,100,60,0.12)' : 'rgba(200,200,200,0.08)',
                                color: isGood ? '#6ef080' : mod > 1 ? '#f0a060' : '#aaa',
                                fontWeight: 600,
                              }}>
                                {c.emoji} {c.name}: {label}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ background: 'rgba(200,160,60,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c8a96e' }}>
                  💡 <strong>Strategy:</strong> The planting menu shows adjusted grow times and highlights the best crop for the current season with a 🌟 badge.
                </div>
              </div>
            )}

            {/* Buildings tab */}
            {tab === 'buildings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Section title="🏗️ What are Buildings?">
                  Buildings are permanent structures you place on empty land tiles. Each one provides a passive bonus that helps your farm grow or earn more. You can't plant crops on a building tile, so choose placement wisely!
                </Section>
                <Section title="🔨 How to Build">
                  Click any empty green land tile. A menu will appear — choose <strong>Construct</strong> to see available buildings. Confirm the purchase and the building will appear immediately.
                </Section>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(Object.values(BUILDING_DEFS) as typeof BUILDING_DEFS[BuildingType][]).map(def => (
                    <div key={def.type} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(200,160,60,0.2)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: 26, lineHeight: 1, marginTop: 2 }}>{def.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                          {def.name} <span style={{ color: '#ffd700', fontWeight: 400, fontSize: 12 }}>— {def.cost} 💰</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#c0b090', lineHeight: 1.6 }}>{def.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(200,160,60,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c8a96e' }}>
                  💡 <strong>Strategy:</strong> A Windmill benefits every plot on the farm, so it's great early on. Once you have many crops, a Barn maximises your sell income. A Greenhouse shines in Winter when penalties are harshest.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#c8a96e', marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#e0d0b0' }}>{children}</div>
    </div>
  )
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`
  return `${s}s`
}
