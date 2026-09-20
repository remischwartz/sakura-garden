import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { tint } from '../debug'
import * as THREE from 'three'
import { SimpleReflector } from '../utils/reflector'
import { useSceneStore } from '../store'
import { SEASON_THEME } from '../theme'
import { POND_CENTER, POND_WATER_Y, pondPointAt, createPondShapeGeometry } from '../utils/pondShape'
import { Lantern } from './Lantern'
import { PondRipples } from './PondRipples'

// Off-center island for the lantern: inside the pond, biased toward the
// tree-facing side, not in the middle.
const ISLAND_ANGLE = 2.05
const ISLAND_FRACTION = 0.4
const [ISLAND_X, ISLAND_Z] = pondPointAt(ISLAND_ANGLE, ISLAND_FRACTION)

export function Pond() {
  const season = useSceneStore((s) => s.season)
  const isNight = useSceneStore((s) => s.isNight)
  const theme = SEASON_THEME[season]
  const raining = season === 'spring' && !isNight

  const pond = useControls('Pond & Reflection', {
    reflectivityDay: { value: 0.6, min: 0, max: 1, step: 0.01, label: 'reflectivity (day)' },
    reflectivityNight: { value: 1, min: 0, max: 1, step: 0.01, label: 'reflectivity (night)' },
    distortion: { value: 0.003, min: 0, max: 0.02, step: 0.0005, label: 'ripple strength' },
    ripples: { value: 60, min: 5, max: 200, step: 1, label: 'ripple scale' },
    rippleSpeed: { value: 0.6, min: 0, max: 4, step: 0.05, label: 'ripple speed' },
    tint: { value: '#ffffff', label: 'water tint' },
    tintMix: { value: 0.55, min: 0, max: 1, step: 0.01, label: 'grey mix' },
    nightDarken: { value: 0.45, min: 0, max: 1, step: 0.01, label: 'night brightness' },
    blur: { value: 1.5, min: 0, max: 8, step: 0.1, label: 'blur (px)' },
    resolution: { value: 1024, options: [512, 1024, 2048, 4096] },
    samples: { value: 0, options: [0, 2, 4, 8], label: 'MSAA samples' },
    stone: { value: '#5c5735', label: 'island stone' },
  }, { collapsed: true })

  // The official three.js Reflector technique (onBeforeRender hooking into
  // the renderer) reimplemented with a plain 8-bit, non-multisampled render
  // target - MSAA + HalfFloat render targets were silently failing to
  // resolve in this pipeline.
  const reflector = useMemo(() => {
    const geometry = createPondShapeGeometry(96)
    return new SimpleReflector(geometry, {
      textureWidth: 1024,
      textureHeight: 1024,
      clipBias: 0.0008,
      color: 0x808080,
    })
  }, [])

  useEffect(() => {
    const c = tint(theme.pondColor, pond.tint).lerp(new THREE.Color('#808080'), pond.tintMix)
    if (isNight) c.multiplyScalar(pond.nightDarken)
    const material = reflector.material as THREE.ShaderMaterial
    material.uniforms.color.value = c
  }, [reflector, theme.pondColor, isNight, pond.tint, pond.tintMix, pond.nightDarken])

  useEffect(() => {
    const u = (reflector.material as THREE.ShaderMaterial).uniforms
    u.reflectivity.value = isNight ? pond.reflectivityNight : pond.reflectivityDay
    // Rain agitates the surface: stronger, finer wobble in the reflection.
    u.distortion.value = pond.distortion * (raining ? 1.6 : 1)
    u.ripples.value = pond.ripples * (raining ? 1.6 : 1)
    u.blur.value = pond.blur
  }, [reflector, isNight, pond.reflectivityDay, pond.reflectivityNight, pond.distortion, pond.ripples, pond.blur, raining])

  useEffect(() => {
    const rt = reflector.getRenderTarget()
    rt.setSize(pond.resolution, pond.resolution)
    rt.samples = pond.samples
    rt.dispose() // reallocate with the new size / sample count
    ;(reflector.material as THREE.ShaderMaterial).uniforms.texel.value.set(1 / pond.resolution, 1 / pond.resolution)
  }, [reflector, pond.resolution, pond.samples])

  useFrame(({ clock }) => {
    ;(reflector.material as THREE.ShaderMaterial).uniforms.time.value = clock.getElapsedTime() * pond.rippleSpeed
  })

  useEffect(() => () => reflector.getRenderTarget().dispose(), [reflector])

  return (
    <group position={[POND_CENTER[0], POND_WATER_Y, POND_CENTER[1]]}>
      <primitive object={reflector} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />
      <PondRipples rain={raining} />

      {/* small island the lantern sits on, off-center in the water */}
      <group position={[ISLAND_X, 0, ISLAND_Z]}>
        <mesh position={[0, 0.1, 0]} scale={[0.62, 0.22, 0.56]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={pond.stone} roughness={1} flatShading />
        </mesh>
        <mesh position={[0.32, 0.02, -0.18]} scale={[0.3, 0.14, 0.28]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7a796f" roughness={1} flatShading />
        </mesh>
        <group position={[0, 0.28, 0]} scale={0.85}>
          <Lantern rotationY={ISLAND_ANGLE + Math.PI} />
        </group>
      </group>
    </group>
  )
}
