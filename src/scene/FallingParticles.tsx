import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls } from 'leva'
import { useSceneStore } from '../store'
import { SEASON_THEME } from '../theme'
import { generateSakuraTree } from '../utils/tree'
import { createPetalGeometry, createLeafGeometry } from '../utils/petalShapes'
import { WIND_DIRECTION } from '../utils/pondShape'
import { smoothRandom } from '../utils/noise'
import { TREES } from '../utils/treeLayout'
import { addPondImpact } from '../utils/pondImpacts'

// Petals/leaves detach from every tree's own canopy anchor points (in world
// space, accounting for each tree's position/rotation/scale), so they read
// as falling FROM the trees rather than spawning in a generic column.
const CANOPY_TIPS: [number, number, number][] = TREES.flatMap((tree) => {
  const cos = Math.cos(tree.rotationY)
  const sin = Math.sin(tree.rotationY)
  return generateSakuraTree(tree.seed).tips.map(([x, y, z]): [number, number, number] => {
    const sx = x * tree.scale
    const sy = y * tree.scale
    const sz = z * tree.scale
    const wx = sx * cos + sz * sin
    const wz = -sx * sin + sz * cos
    return [wx + tree.position[0], sy + tree.position[1], wz + tree.position[2]]
  })
})
const TIP_JITTER = 0.3

const SKY_SPAWN_RADIUS = 9 // snow only: falls broadly, not tied to the tree
const SKY_SPAWN_HEIGHT_MIN = 3.2
const SKY_SPAWN_HEIGHT_MAX = 6

interface ParticleState {
  x: number
  y: number
  z: number
  fallSpeed: number
  phase: number
  swaySpeed: number
  rotSpeed: number
  rot: number
}

const dummy = new THREE.Object3D()

function spawnFromCanopy(): [number, number, number] {
  const tip = CANOPY_TIPS[Math.floor(Math.random() * CANOPY_TIPS.length)]
  return [
    tip[0] + (Math.random() - 0.5) * TIP_JITTER,
    tip[1] + (Math.random() - 0.5) * TIP_JITTER,
    tip[2] + (Math.random() - 0.5) * TIP_JITTER,
  ]
}

function spawnFromSky(): [number, number, number] {
  const angle = Math.random() * Math.PI * 2
  const radius = Math.sqrt(Math.random()) * SKY_SPAWN_RADIUS
  return [
    Math.cos(angle) * radius,
    SKY_SPAWN_HEIGHT_MIN + Math.random() * (SKY_SPAWN_HEIGHT_MAX - SKY_SPAWN_HEIGHT_MIN),
    Math.sin(angle) * radius,
  ]
}

export function FallingParticles() {
  const season = useSceneStore((s) => s.season)
  const windStrength = useSceneStore((s) => s.windStrength)
  const theme = SEASON_THEME[season].particle
  const fromTree = theme.shape !== 'snow'

  const fx = useControls('Animation', {
    windMult: { value: 1, min: 0, max: 4, step: 0.05, label: 'wind push ×' },
    gustiness: { value: 0.3, min: 0, max: 1, step: 0.01 },
    fallSpeed: { value: 1, min: 0, max: 4, step: 0.05, label: 'fall speed ×' },
    sway: { value: 1, min: 0, max: 4, step: 0.05, label: 'sway ×' },
    size: { value: 1, min: 0.2, max: 4, step: 0.05, label: 'particle size ×' },
    count: { value: 1, min: 0, max: 3, step: 0.05, label: 'particle count ×' },
    opacity: { value: 0.95, min: 0, max: 1, step: 0.01 },
    roughness: { value: 0.7, min: 0, max: 1, step: 0.01 },
    timeScale: { value: 1, min: 0, max: 3, step: 0.05, label: 'time scale' },
  }, { collapsed: true })
  const count = Math.round(theme.count * fx.count)

  const meshRef = useRef<THREE.InstancedMesh>(null)

  const particles = useMemo<ParticleState[]>(() => {
    const arr: ParticleState[] = []
    for (let i = 0; i < count; i++) {
      const [x, y, z] = fromTree ? spawnFromCanopy() : spawnFromSky()
      arr.push({
        x,
        y,
        z,
        fallSpeed: theme.fallSpeed * fx.fallSpeed * (0.7 + Math.random() * 0.6),
        phase: Math.random() * Math.PI * 2,
        swaySpeed: 0.6 + Math.random() * 1.2,
        rotSpeed: (Math.random() - 0.5) * 2,
        rot: Math.random() * Math.PI * 2,
      })
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, count, theme.fallSpeed, fx.fallSpeed, fromTree])

  useEffect(() => {
    if (!meshRef.current) return
    const colors = theme.colors.map((c) => new THREE.Color(c))
    for (let i = 0; i < particles.length; i++) {
      meshRef.current.setColorAt(i, colors[i % colors.length])
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [particles, theme.colors])

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const t = clock.getElapsedTime()
    const d = Math.min(delta, 0.05) * fx.timeScale

    const gust = (1 - fx.gustiness) + smoothRandom(t * 0.15, 8.4) * fx.gustiness
    const windX = WIND_DIRECTION[0] * windStrength * gust * 0.8 * fx.windMult
    const windZ = WIND_DIRECTION[1] * windStrength * gust * 0.8 * fx.windMult

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      p.y -= p.fallSpeed * d
      p.x += windX * d + Math.sin(t * p.swaySpeed + p.phase) * theme.sway * fx.sway * 0.3 * d
      p.z += windZ * d + Math.cos(t * p.swaySpeed + p.phase) * theme.sway * fx.sway * 0.3 * d
      p.rot += p.rotSpeed * d

      if (p.y < 0.02) {
        if (fromTree) addPondImpact(p.x, p.z, t)
        const [x, y, z] = fromTree ? spawnFromCanopy() : spawnFromSky()
        p.x = x
        p.z = z
        p.y = y
      }

      dummy.position.set(p.x, p.y, p.z)
      dummy.rotation.set(p.rot * 0.6, p.rot, p.phase)
      dummy.scale.setScalar(theme.size * fx.size * 2.2)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  const geometry = useMemo(() => {
    if (theme.shape === 'snow') return <octahedronGeometry args={[1, 0]} />
    if (theme.shape === 'leaf') return <primitive object={createLeafGeometry()} attach="geometry" />
    return <primitive object={createPetalGeometry()} attach="geometry" />
  }, [theme.shape])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]} key={`${season}-${particles.length}`} frustumCulled={false}>
      {geometry}
      <meshStandardMaterial side={THREE.DoubleSide} roughness={fx.roughness} transparent opacity={fx.opacity} />
    </instancedMesh>
  )
}
