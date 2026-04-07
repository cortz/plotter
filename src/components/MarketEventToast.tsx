import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

export function MarketEventToast() {
  const lastMarketEvent = useGameStore(s => s.lastMarketEvent)
  const [visible, setVisible] = useState(false)
  const [displayedEvent, setDisplayedEvent] = useState(lastMarketEvent)

  useEffect(() => {
    if (!lastMarketEvent) return
    setDisplayedEvent(lastMarketEvent)
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 4500)
    return () => clearTimeout(timer)
  }, [lastMarketEvent?.firedAt])

  if (!visible || !displayedEvent) return null

  const up = displayedEvent.multiplier >= 1
  const pct = Math.round(Math.abs(displayedEvent.multiplier - 1) * 100)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        background: up ? 'rgba(20, 60, 20, 0.95)' : 'rgba(60, 15, 15, 0.95)',
        border: `1px solid ${up ? 'rgba(80,200,80,0.6)' : 'rgba(200,60,60,0.6)'}`,
        borderRadius: 12,
        padding: '12px 24px',
        color: '#f5e6c8',
        fontFamily: 'inherit',
        zIndex: 200,
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        minWidth: 280,
        textAlign: 'center',
        animation: 'fadeSlideUp 0.3s ease-out',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: up ? '#7dff7d' : '#ff7d7d' }}>
        📢 {displayedEvent.name}  {up ? `▲ +${pct}%` : `▼ −${pct}%`}
      </div>
      <div style={{ fontSize: 13, color: '#c8b090' }}>{displayedEvent.description}</div>
    </div>
  )
}
