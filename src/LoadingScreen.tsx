import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useSceneStore } from './store'

const FADE_MS = 600

// Covers the app until the scene has rendered its first frames. Takes over from
// the static #boot-loader in index.html (shown while the JS bundle downloads).
export function LoadingScreen() {
  const sceneReady = useSceneStore((s) => s.sceneReady)
  const progress = useProgress((s) => s.progress)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    document.getElementById('boot-loader')?.remove()
  }, [])

  useEffect(() => {
    if (!sceneReady) return
    const id = setTimeout(() => setGone(true), FADE_MS)
    return () => clearTimeout(id)
  }, [sceneReady])

  if (gone) return null

  return (
    <div className={`loading-screen ${sceneReady ? 'done' : ''}`} role="status" aria-live="polite">
      <div className="loading-petal" aria-hidden="true" />
      <h1>Sakura Garden</h1>
      <div className="loading-bar" aria-hidden="true">
        <div
          className={`loading-bar-fill ${progress > 0 && progress < 100 ? '' : 'indeterminate'}`}
          style={{ width: progress > 0 && progress < 100 ? `${progress}%` : undefined }}
        />
      </div>
      <span className="sr-only">{sceneReady ? 'Loaded' : 'Loading the garden'}</span>
    </div>
  )
}
