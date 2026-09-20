import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Leva } from 'leva'
import { Experience } from './scene/Experience'
import { LoadingScreen } from './LoadingScreen'
import { useSceneStore, type Season } from './store'
import { resetDebugParams } from './debug'
import { SEASON_ORDER, SEASON_THEME } from './theme'
import './App.css'

// Set to false to hide the Leva debug panel.
const SHOW_DEBUG_UI = false

// Mounts only once the Suspense content has resolved; waits a couple of frames
// so shaders compile and the first frames are drawn before revealing the scene.
function SceneReady() {
  const frames = useRef(0)
  useFrame(() => {
    if (++frames.current === 3) useSceneStore.getState().setSceneReady()
  })
  return null
}

interface SegmentOption<T extends string> {
  value: T
  icon: string
  label: string
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.label}
          title={o.label}
          className={`segment ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          <span aria-hidden="true">{o.icon}</span>
        </button>
      ))}
    </div>
  )
}

const SEASON_OPTIONS: SegmentOption<Season>[] = SEASON_ORDER.map((s) => ({
  value: s,
  icon: SEASON_THEME[s].icon,
  label: SEASON_THEME[s].label,
}))

const TIME_OPTIONS: SegmentOption<'day' | 'night'>[] = [
  { value: 'day', icon: '☀️', label: 'Day' },
  { value: 'night', icon: '🌙', label: 'Night' },
]

function Overlay() {
  const season = useSceneStore((s) => s.season)
  const isNight = useSceneStore((s) => s.isNight)
  const autoRotate = useSceneStore((s) => s.autoRotate)
  const setSeason = useSceneStore((s) => s.setSeason)
  const toggleNight = useSceneStore((s) => s.toggleNight)
  const toggleAutoRotate = useSceneStore((s) => s.toggleAutoRotate)

  return (
    <div className="overlay">
      <div className="panel">
        <h1>Sakura Garden</h1>

        <div className="row">
          <SegmentedControl label="Season" options={SEASON_OPTIONS} value={season} onChange={setSeason} />
        </div>

        <div className="row">
          <SegmentedControl
            label="Time of day"
            options={TIME_OPTIONS}
            value={isNight ? 'night' : 'day'}
            onChange={(t) => {
              if ((t === 'night') !== isNight) toggleNight()
            }}
          />
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={autoRotate}
          aria-label="Auto-rotate"
          title="Auto-rotate"
          className={`rotate-toggle ${autoRotate ? 'active' : ''}`}
          onClick={toggleAutoRotate}
        >
          <span aria-hidden="true">🔄</span>
        </button>
      </div>
    </div>
  )
}

function App() {
  // Switching season or day/night reloads the default debug params.
  useEffect(
    () =>
      useSceneStore.subscribe((state, prev) => {
        if (state.season === prev.season && state.isNight === prev.isNight) return
        // Deferred + guarded: a throw here must never stop the store from
        // notifying the (separate) r3f renderer of the season change.
        setTimeout(() => {
          try {
            resetDebugParams()
          } catch (e) {
            console.error('resetDebugParams failed', e)
          }
        }, 0)
      }),
    [],
  )

  return (
    <div className="app-root">
      <Canvas
        shadows="percentage"
        camera={{ position: [6, 4, 8.5], fov: 45 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Experience />
          <SceneReady />
        </Suspense>
      </Canvas>
      <Overlay />
      <LoadingScreen />
      <Leva hidden={!SHOW_DEBUG_UI} collapsed titleBar={{ title: 'Debug' }} />
    </div>
  )
}

export default App
