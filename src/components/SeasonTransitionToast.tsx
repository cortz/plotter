import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { SEASON_CONFIGS } from '../modules/SeasonManager'
import type { Season } from '../types'

export function SeasonTransitionToast() {
  const currentSeason = useGameStore(s => s.currentSeason)
  const [visible, setVisible] = useState(false)
  const prevSeason = useRef<Season>(currentSeason)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (prevSeason.current === currentSeason) return
    prevSeason.current = currentSeason
    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 4500)
  }, [currentSeason])

  if (!visible) return null

  const config = SEASON_CONFIGS[currentSeason]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.82)',
        color: '#fff',
        borderRadius: 12,
        padding: '12px 24px',
        fontSize: 15,
        fontWeight: 600,
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: 9999,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        animation: 'fadeInUp 0.35s ease',
        maxWidth: 320,
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 4 }}>{config.emoji} {config.label} has arrived!</div>
      <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 400 }}>{config.description}</div>
    </div>
  )
}
