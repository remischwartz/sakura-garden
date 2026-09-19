import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useControls } from 'leva'
import { useSceneStore } from '../store'
import { tint } from '../debug'
import { SEASON_THEME } from '../theme'
import { generateSakuraTree } from '../utils/tree'
import { WIND_DIRECTION } from '../utils/pondShape'

const BARK_COLOR = '#5b4636'

function buildTrunkGeometry(seed: number) {
  const { branches } = generateSakuraTree(seed)
  const up = new THREE.Vector3(0, 1, 0)
  const geometries: THREE.BufferGeometry[] = []

  for (const branch of branches) {
    const start = new THREE.Vector3(...branch.start)
    const end = new THREE.Vector3(...branch.end)
    const dir = new THREE.Vector3().subVectors(end, start)
    const length = dir.length()
    if (length < 1e-4) continue
    dir.normalize()

    const geo = new THREE.CylinderGeometry(
      Math.max(branch.radiusEnd, 0.012),
      Math.max(branch.radiusStart, 0.012),
      length,
      6,
      1,
    )
    geo.translate(0, length / 2, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir)
    geo.applyQuaternion(quaternion)
    geo.translate(start.x, start.y, start.z)
    geometries.push(geo)
  }

  return mergeGeometries(geometries, false)
}

interface Puff {
  position: THREE.Vector3
  scale: number
  phase: number
  speed: number
  colorIndex: number
}

function buildCanopyPuffs(treeSeed: number, colorSeedOffset: number): Puff[] {
  const { tips } = generateSakuraTree(treeSeed)
  const puffs: Puff[] = []
  let s = colorSeedOffset
  const rand = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }

  for (const tip of tips) {
    const clusterSize = 1 + Math.floor(rand() * 2)
    for (let i = 0; i < clusterSize; i++) {
      const offset = new THREE.Vector3(
        (rand() - 0.5) * 0.35,
        (rand() - 0.5) * 0.25 + 0.1,
        (rand() - 0.5) * 0.35,
      )
      puffs.push({
        position: new THREE.Vector3(...tip).add(offset),
        scale: 0.3 + rand() * 0.26,
        phase: rand() * Math.PI * 2,
        speed: 0.6 + rand() * 0.8,
        colorIndex: Math.floor(rand() * 4),
      })
    }
  }
  return puffs
}

const dummy = new THREE.Object3D()

export interface SakuraTreeProps {
  seed?: number
  position?: [number, number, number]
  rotationY?: number
  scale?: number
}

export function SakuraTree({ seed = 7, position = [0, 0, 0], rotationY = 0, scale = 1 }: SakuraTreeProps) {
  const season = useSceneStore((s) => s.season)
  const windStrength = useSceneStore((s) => s.windStrength)
  const theme = SEASON_THEME[season]

  const tree = useControls('Trees', {
    canopyTint: { value: '#ffffff', label: 'canopy tint' },
    canopyRoughness: { value: 0.85, min: 0, max: 1, step: 0.01 },
    bark: { value: BARK_COLOR, label: 'bark color' },
    flutter: { value: 1, min: 0, max: 4, step: 0.05, label: 'flutter ×' },
    lean: { value: 1, min: 0, max: 4, step: 0.05, label: 'lean ×' },
    speed: { value: 1, min: 0, max: 4, step: 0.05, label: 'animation speed ×' },
  }, { collapsed: true })

  const trunkGeometry = useMemo(() => buildTrunkGeometry(seed), [seed])
  const puffs = useMemo(() => buildCanopyPuffs(seed, seed * 97 + 5), [seed])

  // Wind direction expressed in this tree's local space (undo its own
  // rotationY) so every tree leans the same way in world space.
  const localWind = useMemo(() => {
    const cos = Math.cos(rotationY)
    const sin = Math.sin(rotationY)
    return [cos * WIND_DIRECTION[0] - sin * WIND_DIRECTION[1], sin * WIND_DIRECTION[0] + cos * WIND_DIRECTION[1]]
  }, [rotationY])

  const canopyRef = useRef<THREE.InstancedMesh>(null)
  const snowRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    if (!canopyRef.current) return
    const colors = theme.canopyColors.map((c) => tint(c, tree.canopyTint))
    puffs.forEach((puff, i) => {
      canopyRef.current!.setColorAt(i, colors[puff.colorIndex % colors.length])
    })
    if (canopyRef.current.instanceColor) canopyRef.current.instanceColor.needsUpdate = true
  }, [theme, puffs, tree.canopyTint])

  useEffect(() => {
    if (!snowRef.current) return
    puffs.forEach((puff, i) => {
      dummy.position.copy(puff.position)
      dummy.position.y += 0.08
      dummy.scale.set(puff.scale * 0.85, puff.scale * 0.4, puff.scale * 0.85)
      dummy.rotation.set(0, puff.phase, 0)
      dummy.updateMatrix()
      snowRef.current!.setMatrixAt(i, dummy.matrix)
    })
    snowRef.current.instanceMatrix.needsUpdate = true
  }, [puffs, theme.snowOnBranches])

  useFrame(({ clock }) => {
    if (!canopyRef.current || !theme.canopyVisible) return
    const t = clock.getElapsedTime() * tree.speed
    const leanX = localWind[0] * windStrength * 0.13 * tree.lean
    const leanZ = localWind[1] * windStrength * 0.13 * tree.lean
    puffs.forEach((puff, i) => {
      const flutter = Math.sin(t * puff.speed + puff.phase) * windStrength * 0.14 * tree.flutter
      const bob = Math.sin(t * puff.speed * 1.4 + puff.phase) * windStrength * 0.05
      dummy.position.set(
        puff.position.x + leanX + flutter * localWind[1],
        puff.position.y + bob,
        puff.position.z + leanZ - flutter * localWind[0],
      )
      dummy.scale.setScalar(puff.scale)
      dummy.rotation.set(0, puff.phase + t * 0.1, 0)
      dummy.updateMatrix()
      canopyRef.current!.setMatrixAt(i, dummy.matrix)
    })
    canopyRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh geometry={trunkGeometry} castShadow receiveShadow>
        <meshStandardMaterial color={tree.bark} roughness={0.95} flatShading />
      </mesh>

      {theme.canopyVisible && (
        <instancedMesh ref={canopyRef} args={[undefined, undefined, puffs.length]} castShadow frustumCulled={false}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial roughness={tree.canopyRoughness} flatShading />
        </instancedMesh>
      )}

      {theme.snowOnBranches && (
        <instancedMesh ref={snowRef} args={[undefined, undefined, puffs.length]} castShadow frustumCulled={false}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#f5f8fa" roughness={0.9} flatShading />
        </instancedMesh>
      )}
    </group>
  )
}
