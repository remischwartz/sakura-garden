import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '../store'
import { POND_CENTER, pondEdgeRadius } from '../utils/pondShape'

const GREEN_COLORS = ['#4f8f4a', '#5fa457', '#3f7d43', '#6bb35f']
const AUTUMN_COLORS = ['#7a8f4a', '#8f9a4f', '#6f8a43', '#9aa25a']
const SNOW_COLORS = ['#eef3f5', '#e2ebee', '#f5f8f9']

interface Clump {
  x: number
  y: number
  z: number
  scale: number
  colorIndex: number
}

interface Bush {
  clumps: Clump[]
}

function mulberry32(seed: number) {
  return function rng() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Scatter a handful of bush clusters just outside the pond's (irregular)
// shoreline.
function buildBushes(): Bush[] {
  const rng = mulberry32(99)
  const bushes: Bush[] = []
  const count = 11
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rng() * 0.4
    const shore = pondEdgeRadius(angle)
    const setback = 0.55 + rng() * 0.7
    const cx = POND_CENTER[0] + Math.cos(angle) * (shore + setback)
    const cz = POND_CENTER[1] + Math.sin(angle) * (shore + setback)

    const clumpCount = 2 + Math.floor(rng() * 3)
    const clumps: Clump[] = []
    for (let c = 0; c < clumpCount; c++) {
      clumps.push({
        x: cx + (rng() - 0.5) * 0.5,
        y: 0.16 + rng() * 0.1,
        z: cz + (rng() - 0.5) * 0.5,
        scale: 0.26 + rng() * 0.22,
        colorIndex: Math.floor(rng() * 4),
      })
    }
    bushes.push({ clumps })
  }
  return bushes
}

const BUSHES = buildBushes()
const dummy = new THREE.Object3D()

export function Bushes() {
  const season = useSceneStore((s) => s.season)
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const clumps = useMemo(() => BUSHES.flatMap((b) => b.clumps), [])

  const colors = useMemo(() => {
    if (season === 'winter') return SNOW_COLORS
    if (season === 'autumn') return AUTUMN_COLORS
    return GREEN_COLORS
  }, [season])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    clumps.forEach((clump, i) => {
      dummy.position.set(clump.x, clump.y, clump.z)
      dummy.scale.setScalar(clump.scale)
      dummy.rotation.set(0, clump.colorIndex, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, new THREE.Color(colors[clump.colorIndex % colors.length]))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [clumps, colors])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, clumps.length]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.9} flatShading />
    </instancedMesh>
  )
}
