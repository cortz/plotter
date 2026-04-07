import type { PersistedState } from '../types'

const SAVE_KEY = 'plot_game_v1'

export const SaveManager = {
  save: (state: PersistedState): void => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    } catch (e) {
      console.warn('Save failed:', e)
    }
  },

  load: (): PersistedState | null => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      return raw ? (JSON.parse(raw) as PersistedState) : null
    } catch (e) {
      console.warn('Load failed:', e)
      return null
    }
  },

  clear: (): void => {
    localStorage.removeItem(SAVE_KEY)
  },
}
