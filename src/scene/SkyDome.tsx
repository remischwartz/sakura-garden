import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Sky, Stars, Sparkles, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useControls, levaStore } from 'leva'
import { useSceneStore } from '../store'
import { orbit, tint } from '../debug'
import { SEASON_THEME } from '../theme'

export function SkyDome() {
  const isNight = useSceneStore((s) => s.isNight)
  const season = useSceneStore((s) => s.season)
    const theme = SEASON_THEME[season]
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const moonMeshRef = useRef<THREE.Mesh>(null)
  const { scene, gl } = useThree()

  const lights = useControls('Lights', {
    exposure: { value: 1, min: 0.1, max: 3, step: 0.01 },
    sunIntensity: { value: season === 'winter' ? 1 : 3, min: 0, max: 4, step: 0.01, label: 'sun ×' },
    sunTint: { value: season === 'winter' || isNight ? '#ffffff' : '#ff9900', label: 'sun tint' },
    sunAzimuth: { value: 0, min: -180, max: 180, step: 1, label: 'sun azimuth°' },
    sunElevation: { value: 0, min: -60, max: 60, step: 1, label: 'sun elevation°' },
    ambientIntensity: { value: 1, min: 0, max: 4, step: 0.01, label: 'ambient ×' },
    ambientTint: { value: '#ffffff', label: 'ambient tint' },
    hemiIntensity: { value: 1, min: 0, max: 4, step: 0.01, label: 'hemisphere ×' },
    hemiTint: { value: '#ffffff', label: 'hemisphere tint' },
  }, { collapsed: true })

  const shadows = useControls('Shadows', {
    enabled: true,
    radius: { value: 1, min: 0, max: 10, step: 0.1 },
    bias: { value: 0, min: -0.005, max: 0.005, step: 0.0001 },
    normalBias: { value: 0, min: 0, max: 0.2, step: 0.005 },
  }, { collapsed: true })

  const sky = useControls('Sky & Fog', {
    envIntensity: { value: 0.27, min: 0, max: 3, step: 0.01, label: 'HDR intensity' },
    envRotation: { value: 180, min: -180, max: 180, step: 1, label: 'HDR rotation°' },
    envBlur: { value: 0, min: 0, max: 1, step: 0.01, label: 'HDR bg blur' },
    fogNear: { value: 14, min: 0, max: 60, step: 0.5 },
    fogFar: { value: 34, min: 5, max: 120, step: 0.5 },
    fogTint: { value: '#ffffff', label: 'fog tint (multiply)' },
    fogOverride: { value: false, label: 'override fog color' },
    fogColor: { value: '#ffffff', label: 'fog color' },
    stars: { value: 2500, min: 0, max: 8000, step: 100 },
    moonColor: '#eef3ff',
    sparkles: { value: 40, min: 0, max: 300, step: 1, label: 'fireflies' },
    sparkleColor: '#bfffcf',
  }, { collapsed: true })

  // Leva captures defaults at first mount; keep them (and the current values)
  // in step with the season/time so a reset restores the right look.
  useEffect(() => {
    const values = {
      'Lights.sunIntensity': season === 'winter' ? 1 : 3,
      'Lights.sunTint': season === 'winter' || isNight ? '#ffffff' : '#ff9900',
    }
    const data = levaStore.getData() as Record<string, { initialValue?: unknown }>
    for (const [path, v] of Object.entries(values)) {
      if (data[path]) data[path].initialValue = v
    }
    levaStore.set(values, false)
  }, [season, isNight])

  useEffect(() => {
    gl.toneMappingExposure = lights.exposure
  }, [gl, lights.exposure])

  // Warm, low-sun "golden hour" look for daytime - except in winter, which
  // keeps a crisp, cool, high-sun daylight.
  const warmDay = !isNight && season !== 'winter'

  // Winter nights read brighter mostly because the winter ground/canopy
  // colors are much lighter (snow), not because the light itself differs.
  // Boost the actual night light for the other seasons so they match.
  const nightBoost = isNight && season !== 'winter' ? 1.9 : 1

  useEffect(() => {
    scene.fog = new THREE.Fog(
      sky.fogOverride
        ? new THREE.Color(sky.fogColor)
        : tint(isNight ? '#050814' : theme.fogColor, sky.fogTint),
      sky.fogNear,
      sky.fogFar,
    )
    if (warmDay) return // <Environment background> owns scene.background here
    // Otherwise the Sky dome mesh (or night color) is the background.
    scene.background = isNight ? new THREE.Color('#040611') : null
  }, [isNight, warmDay, scene, sky.fogTint, theme.fogColor, sky.fogOverride, sky.fogColor, sky.fogNear, sky.fogFar])

  return (
    <>
      {!isNight &&
        (warmDay ? (
          <Environment
            files={`${import.meta.env.BASE_URL}citrus_orchard_road_puresky_1k.hdr`}
            background
            backgroundBlurriness={sky.envBlur}
            environmentIntensity={sky.envIntensity}
            backgroundRotation={[0, THREE.MathUtils.degToRad(sky.envRotation), 0]}
            environmentRotation={[0, THREE.MathUtils.degToRad(sky.envRotation), 0]}
          />
        ) : (
          <Sky sunPosition={[10, 6, 8]} turbidity={4} rayleigh={1.2} />
        ))}

      {isNight && (
        <>
          <Stars radius={60} depth={30} count={sky.stars} factor={2.2} fade speed={0.4} />
          <mesh ref={moonMeshRef} position={[-10, 14, -12]}>
            <sphereGeometry args={[1.1, 16, 16]} />
            <meshBasicMaterial color={sky.moonColor} />
          </mesh>
          <Sparkles
            count={sky.sparkles}
            scale={[6, 2, 6]}
            position={[0, 1.2, 0]}
            size={3}
            speed={0.3}
            color={sky.sparkleColor}
            opacity={0.6}
          />
        </>
      )}

      <ambientLight
        intensity={(isNight ? 0.18 * nightBoost : warmDay ? 0.22 : 0.55) * lights.ambientIntensity}
        color={tint(isNight ? '#3d4d7a' : warmDay ? '#ffd3a0' : '#fff3e0', lights.ambientTint)}
      />
      <directionalLight
        ref={sunRef}
        position={orbit(
          isNight ? [-10, 14, -12] : warmDay ? [-9, 4, -5] : [10, 12, 8],
          lights.sunAzimuth,
          lights.sunElevation,
        )}
        intensity={(isNight ? 0.35 * nightBoost : warmDay ? 1.1 : 1.4) * lights.sunIntensity}
        color={tint(isNight ? '#8fa6ff' : warmDay ? '#ff9d5c' : '#fff2d8', lights.sunTint)}
        castShadow={shadows.enabled}
        shadow-radius={shadows.radius}
        shadow-bias={shadows.bias}
        shadow-normalBias={shadows.normalBias}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-far={40}
      />
      <hemisphereLight
        color={tint(isNight ? '#1c2340' : warmDay ? '#ffdcb8' : '#cfe8ff', lights.hemiTint)}
        groundColor={isNight ? '#0a0c18' : warmDay ? '#9a6f4a' : '#8fae7a'}
        intensity={(isNight ? 0.3 * nightBoost : warmDay ? 0.3 : 0.6) * lights.hemiIntensity}
      />
    </>
  )
}
