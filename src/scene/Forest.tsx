import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '../store'
import { SEASON_THEME } from '../theme'
import { POND_CENTER } from '../utils/pondShape'

// Trees ringing the clearing. The ring sits beyond the camera's default
// max orbit distance (16) around the orbit target, so the camera never
// passes through the trunks or foliage.
const RING_INNER = 18.5
const RING_DEPTH = 5
const TREE_COUNT = 46
const BLOBS_PER_TREE = 4
const BARK_COLOR = '#4a3a2c'

interface Blob {
  matrix: THREE.Matrix4
  colorIndex: number
}

function buildForest() {
  let s = 1337
  const rand = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  const trunks: THREE.Matrix4[] = []
  const blobs: Blob[] = []
  const dummy = new THREE.Object3D()

  for (let i = 0; i < TREE_COUNT; i++) {
    const angle = ((i + rand() * 0.8) / TREE_COUNT) * Math.PI * 2
    const dist = RING_INNER + rand() * RING_DEPTH
    const x = POND_CENTER[0] + Math.cos(angle) * dist
    const z = POND_CENTER[1] + Math.sin(angle) * dist
    const height = 3.2 + rand() * 2.4
    const canopy = 1.5 + rand() * 0.9

    dummy.position.set(x, height * 0.4, z)
    dummy.rotation.set(0, rand() * Math.PI * 2, 0)
    dummy.scale.set(0.22 + rand() * 0.1, height * 0.8, 0.22 + rand() * 0.1)
    dummy.updateMatrix()
    trunks.push(dummy.matrix.clone())

    for (let b = 0; b < BLOBS_PER_TREE; b++) {
      const t = b / (BLOBS_PER_TREE - 1)
      const r = canopy * (1 - t * 0.45)
      dummy.position.set(
        x + (rand() - 0.5) * canopy * 0.6,
        height * (0.55 + t * 0.5) + (rand() - 0.5) * 0.3,
        z + (rand() - 0.5) * canopy * 0.6,
      )
      dummy.rotation.set(rand(), rand() * Math.PI, rand())
      dummy.scale.set(r, r * 0.85, r)
      dummy.updateMatrix()
      blobs.push({ matrix: dummy.matrix.clone(), colorIndex: Math.floor(rand() * 4) })
    }
  }
  return { trunks, blobs }
}

export function Forest() {
  const season = useSceneStore((s) => s.season)
  const theme = SEASON_THEME[season]
  const { trunks, blobs } = useMemo(() => buildForest(), [])
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const canopyRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const mesh = trunkRef.current
    if (!mesh) return
    trunks.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
  }, [trunks])

  useEffect(() => {
    const mesh = canopyRef.current
    if (!mesh) return
    const colors = theme.canopyColors.map((c) => new THREE.Color(c))
    blobs.forEach((b, i) => {
      mesh.setMatrixAt(i, b.matrix)
      mesh.setColorAt(i, colors[b.colorIndex % colors.length])
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [blobs, theme])

  return (
    <>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, trunks.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.7, 1, 1, 6]} />
        <meshStandardMaterial color={BARK_COLOR} roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, blobs.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </>
  )
}
