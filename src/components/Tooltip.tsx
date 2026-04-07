import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

export function Tooltip() {
  const tooltip = useGameStore(s => s.tooltip)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  if (!tooltip) return null

  const lines = tooltip.content.split('\n')

  return (
    <div style={{
      position: 'fixed',
      left: pos.x + 14,
      top: pos.y + 14,
      background: 'rgba(15,8,2,0.92)',
      border: '1px solid rgba(200,160,60,0.4)',
      borderRadius: 8,
      padding: '8px 12px',
      color: '#f5e6c8',
      fontSize: 13,
      fontFamily: 'inherit',
      pointerEvents: 'none',
      zIndex: 100,
      maxWidth: 240,
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      lineHeight: 1.5,
    }}>
      {lines.map((line, i) => (
        <div key={i} style={i === 0 ? { fontWeight: 700 } : { color: '#c8b090', marginTop: 2 }}>
          {line}
        </div>
      ))}
    </div>
  )
}
