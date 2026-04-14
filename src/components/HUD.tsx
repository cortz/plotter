import { useGameStore } from '../store/gameStore'
import { CropManager } from '../modules/CropManager'
import { HelpButton } from './HelpButton'

export function HUD() {
  const balance = useGameStore(s => s.balance)
  const inventory = useGameStore(s => s.inventory)
  const toggleMarket = useGameStore(s => s.toggleMarket)
  const marketOpen = useGameStore(s => s.marketOpen)
  const resetGame = useGameStore(s => s.resetGame)

  const crops = CropManager.getAllCrops()
  const totalCrops = crops.reduce((acc, c) => acc + (inventory[c.type]?.length ?? 0), 0)
  const compostCount = inventory.compost?.length ?? 0
  const hasInventory = totalCrops > 0 || compostCount > 0

  function handleReset() {
    if (window.confirm('Start a new game? All progress will be lost.')) {
      resetGame()
    }
  }

  return (
    <div style={{
      position: 'absolute', top: 12, left: 12, right: 12,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      pointerEvents: 'none', zIndex: 10,
    }}>
      {/* Balance & inventory */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Panel>
          <span style={{ fontSize: 22, lineHeight: 1 }}>💰</span>
          <span style={{ fontWeight: 700, fontSize: 18 }}>{balance}</span>
        </Panel>

        {hasInventory && (
          <Panel>
            {crops.filter(c => (inventory[c.type]?.length ?? 0) > 0).map(c => (
              <span key={c.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {c.emoji} <strong>{inventory[c.type].length}</strong>
              </span>
            ))}
            {compostCount > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                🪣 <strong>{compostCount}</strong>
              </span>
            )}
          </Panel>
        )}
      </div>

      {/* Right-side buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', pointerEvents: 'all' }}>
        <button
          onClick={toggleMarket}
          style={{
            background: marketOpen ? '#5a3a1a' : '#8B5E3C',
            color: '#fff',
            border: '2px solid #c8903a',
            borderRadius: 10,
            padding: '8px 16px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          🏪 Market
        </button>
        <HelpButton />
        <button
          onClick={handleReset}
          style={{
            background: 'rgba(20,12,5,0.75)',
            color: '#c87a7a',
            border: '1px solid rgba(200,80,80,0.4)',
            borderRadius: 10,
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          🔄 New Game
        </button>
      </div>
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(20,12,5,0.75)',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(200,160,60,0.4)',
      borderRadius: 10,
      padding: '6px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: '#f5e6c8',
      fontFamily: 'inherit',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {children}
    </div>
  )
}
