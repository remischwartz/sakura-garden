import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import { Experience } from './scene/Experience'
import { useSceneStore, type Season } from './store'
import { resetDebugParams } from './debug'
import { SEASON_ORDER, SEASON_THEME } from './theme'
import './App.css'

// Set to false to hide the Leva debug panel.
const SHOW_DEBUG_UI = false

function Loader() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="hotpink" wireframe />
    </mesh>
  )
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

const ROTATE_OPTIONS: SegmentOption<'off' | 'on'>[] = [
  { value: 'off', icon: '⏸', label: 'Rotation off' },
  { value: 'on', icon: '🔄', label: 'Auto-rotate' },
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

        {/* <div className="row">
          <label className="slider-label" htmlFor="wind">
            Wind {Math.round(windStrength * 100)}%
          </label>
          <input
            id="wind"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={windStrength}
            onChange={(e) => setWindStrength(Number(e.target.value))}
          />
        </div> */}

        <div className="row">
          <SegmentedControl
            label="Camera rotation"
            options={ROTATE_OPTIONS}
            value={autoRotate ? 'on' : 'off'}
            onChange={(r) => {
              if ((r === 'on') !== autoRotate) toggleAutoRotate()
            }}
          />
        </div>
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
        shadows
        camera={{ position: [6, 4, 8.5], fov: 45 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={<Loader />}>
          <Experience />
        </Suspense>
      </Canvas>
      <Overlay />
      <Leva hidden={!SHOW_DEBUG_UI} collapsed titleBar={{ title: 'Debug' }} />
    </div>
  )
}

export default App
