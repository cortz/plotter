import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { SEASON_CONFIGS, getSeasonProgress, getBestCropsForSeason } from '../modules/SeasonManager'
import { CropManager } from '../modules/CropManager'

export function SeasonBadge() {
  const currentSeason = useGameStore(s => s.currentSeason)
  const seasonStartedAt = useGameStore(s => s.seasonStartedAt)
  const [, setTick] = useState(0)

  // Re-render every second so the progress bar moves
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const config = SEASON_CONFIGS[currentSeason]
  const progress = getSeasonProgress(seasonStartedAt)
  const bestCrops = getBestCropsForSeason(currentSeason)

  const tooltipLines = bestCrops.map(ct => {
    const def = CropManager.getCropDefinition(ct)
    const mod = config.growthMod[ct]
    const label = mod < 1 ? `⚡ ${Math.round((1 - mod) * 100)}% faster` : mod > 1 ? `🐢 ${Math.round((mod - 1) * 100)}% slower` : '→ Normal'
    return `${def.emoji} ${def.name}: ${label}`
  })

  const minsLeft = Math.max(0, Math.round(((1 - progress) * 5 * 60) / 60 * 10) / 10)

  return (
    <div
      title={`${config.description}\n\nGrowth this season:\n${tooltipLines.join('\n')}\n\n~${minsLeft} min remaining`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(0,0,0,0.55)',
        borderRadius: 10,
        padding: '6px 14px 8px',
        minWidth: 120,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>
        {config.emoji} {config.label}
      </span>
      <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 3,
            transition: 'width 1s linear',
          }}
        />
      </div>
    </div>
  )
}
