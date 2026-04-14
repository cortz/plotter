import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { CropManager } from '../modules/CropManager'
import type { CropType } from '../types'

export function InventoryExpireToast() {
  const lastInventoryExpireEvent = useGameStore(s => s.lastInventoryExpireEvent)
  const [visible, setVisible] = useState(false)
  const [displayedEvent, setDisplayedEvent] = useState<{ cropType: CropType; count: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!lastInventoryExpireEvent) return
    const ev = { cropType: lastInventoryExpireEvent.cropType, count: lastInventoryExpireEvent.count }
    const show = setTimeout(() => {
      setDisplayedEvent(ev)
      setVisible(true)
    }, 0)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(show)
  }, [lastInventoryExpireEvent?.firedAt])

  if (!visible || !displayedEvent) return null

  const def = CropManager.getCropDefinition(displayedEvent.cropType)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(50, 10, 10, 0.95)',
        border: '1px solid rgba(200, 60, 60, 0.6)',
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
        minWidth: 260,
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: '#ff7d7d' }}>
        📦 {displayedEvent.count}× {def.name} expired and was lost!
      </div>
      <div style={{ fontSize: 13, color: '#c8b090' }}>
        Sell your crops before they go bad
      </div>
    </div>
  )
}
