import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { CropManager } from '../modules/CropManager'
import type { CropType } from '../types'

export function SpoilToast() {
  const lastSpoilEvent = useGameStore(s => s.lastSpoilEvent)
  const [visible, setVisible] = useState(false)
  const [displayedCrop, setDisplayedCrop] = useState<CropType | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!lastSpoilEvent) return
    const crop = lastSpoilEvent.cropType
    // Defer to avoid synchronous setState-in-effect lint warning
    const show = setTimeout(() => {
      setDisplayedCrop(crop)
      setVisible(true)
    }, 0)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 4500)
    return () => clearTimeout(show)
  }, [lastSpoilEvent?.firedAt])

  if (!visible || !displayedCrop) return null

  const def = CropManager.getCropDefinition(displayedCrop)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(40, 20, 5, 0.95)',
        border: '1px solid rgba(160, 100, 40, 0.6)',
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
        minWidth: 240,
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: '#c8903a' }}>
        🍂 {def.name} turned to compost!
      </div>
      <div style={{ fontSize: 13, color: '#c8b090' }}>
        Collect it and use as fertilizer 🪣
      </div>
    </div>
  )
}
