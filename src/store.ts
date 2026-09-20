import { create } from 'zustand'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

// Season and day/night live in the query string (?season=autumn&time=night).
function readUrlState(): { season: Season; isNight: boolean } {
  const params = new URLSearchParams(window.location.search)
  const season = params.get('season') as Season
  return {
    season: SEASONS.includes(season) ? season : 'winter',
    isNight: !params.get('time') || params.get('time') === 'night',
  }
}

const initial = readUrlState()

interface SceneState {
  season: Season
  isNight: boolean
  windStrength: number
  autoRotate: boolean
  sceneReady: boolean
  setSceneReady: () => void
  setSeason: (season: Season) => void
  toggleNight: () => void
  setWindStrength: (value: number) => void
  toggleAutoRotate: () => void
}

export const useSceneStore = create<SceneState>((set) => ({
  season: initial.season,
  isNight: initial.isNight,
  windStrength: 0.5,
  autoRotate: false,
  sceneReady: false,
  setSceneReady: () => set({ sceneReady: true }),
  setSeason: (season) => set({ season }),
  toggleNight: () => set((s) => ({ isNight: !s.isNight })),
  setWindStrength: (windStrength) => set({ windStrength }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
}))

useSceneStore.subscribe((state, prev) => {
  if (state.season === prev.season && state.isNight === prev.isNight) return
  const url = new URL(window.location.href)
  url.searchParams.set('season', state.season)
  url.searchParams.set('time', state.isNight ? 'night' : 'day')
  window.history.replaceState(null, '', url)
})
