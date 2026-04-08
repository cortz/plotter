import { useEffect } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { HUD } from './components/HUD'
import { MarketPanel } from './components/MarketPanel'
import { BuildingMenu } from './components/BuildingMenu'
import { MultiPlantingMenu } from './components/MultiPlantingMenu'
import { Tooltip } from './components/Tooltip'
import { MarketEventToast } from './components/MarketEventToast'
import { SeasonBadge } from './components/SeasonBadge'
import { SeasonTransitionToast } from './components/SeasonTransitionToast'
import { useGameStore } from './store/gameStore'

function App() {
  const loadGame = useGameStore(s => s.loadGame)

  useEffect(() => {
    loadGame()
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#1a2e0d',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Three.js canvas fills the screen */}
      <GameCanvas />

      {/* React UI overlays */}
      <HUD />
      <MarketPanel />
      <BuildingMenu />
      <MultiPlantingMenu />
      <Tooltip />
      <MarketEventToast />
      <SeasonTransitionToast />

      {/* Season badge — top center */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        pointerEvents: 'none',
      }}>
        <SeasonBadge />
      </div>

      {/* Title watermark */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        color: 'rgba(200,200,200,0.3)',
        fontSize: 12,
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        🌾 Plot — drag tiles to select · click to interact
      </div>
    </div>
  )
}

export default App
