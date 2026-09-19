import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls } from 'leva'
import { useSceneStore } from '../store'
import { smoothRandom } from '../utils/noise'

const STONE_COLOR = '#8a8a82'
const STONE_COLOR_DARK = '#6f6f68'

export interface LanternProps {
  position?: [number, number, number]
  rotationY?: number
}

export function Lantern({ position = [0, 0, 0], rotationY = 0 }: LanternProps) {
  const isNight = useSceneStore((s) => s.isNight)

  const flame = useControls('Lantern', {
    color: { value: '#ffab5e', label: 'light color' },
    emissive: { value: '#ff7a2d', label: 'flame color' },
    minIntensity: { value: 2.1, min: 0, max: 10, step: 0.1 },
    maxIntensity: { value: 3.6, min: 0, max: 10, step: 0.1 },
    distance: { value: 5, min: 0, max: 20, step: 0.1 },
    flickerSpeed: { value: 1, min: 0, max: 5, step: 0.05, label: 'flicker speed' },
    flickerSize: { value: 0.15, min: 0, max: 0.6, step: 0.01, label: 'flame wobble' },
    alwaysOn: { value: false, label: 'lit in daytime' },
  }, { collapsed: true })
  const lit = isNight || flame.alwaysOn

  const flameLightRef = useRef<THREE.PointLight>(null)
  const flameMeshRef = useRef<THREE.Mesh>(null)
  const flameMaterialRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const flicker = smoothRandom(t * 9 * flame.flickerSpeed, 3.7) * 0.5 +
      smoothRandom(t * 23 * flame.flickerSpeed, 11.2) * 0.5
    const targetIntensity = lit ? THREE.MathUtils.mapLinear(flicker, -1, 1, flame.minIntensity, flame.maxIntensity) : 0
    if (flameLightRef.current) {
      flameLightRef.current.intensity = THREE.MathUtils.lerp(
        flameLightRef.current.intensity,
        targetIntensity,
        0.25,
      )
    }
    if (flameMeshRef.current) {
      const scale = lit ? 1 + flicker * flame.flickerSize : 0.7
      flameMeshRef.current.scale.setScalar(scale)
    }
    if (flameMaterialRef.current) {
      flameMaterialRef.current.emissiveIntensity = lit
        ? THREE.MathUtils.mapLinear(flicker, -1, 1, 1.6, 3.2)
        : 0
    }
  })

  const pillarPositions: [number, number][] = [
    [0.34, 0.34],
    [0.34, -0.34],
    [-0.34, 0.34],
    [-0.34, -0.34],
  ]

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* base */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.65, 0.2, 6]} />
        <meshStandardMaterial color={STONE_COLOR_DARK} roughness={1} flatShading />
      </mesh>
      {/* pedestal post */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.22, 0.7, 6]} />
        <meshStandardMaterial color={STONE_COLOR} roughness={1} flatShading />
      </mesh>
      {/* platform under firebox */}
      <mesh position={[0, 0.98, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.45, 0.14, 6]} />
        <meshStandardMaterial color={STONE_COLOR} roughness={1} flatShading />
      </mesh>

      {/* firebox: open pillar cage so the flame is visible from all sides */}
      <group position={[0, 1.35, 0]}>
        {pillarPositions.map(([x, z], i) => (
          <mesh key={i} position={[x, 0, z]} castShadow>
            <boxGeometry args={[0.1, 0.7, 0.1]} />
            <meshStandardMaterial color={STONE_COLOR} roughness={1} flatShading />
          </mesh>
        ))}
        {/* lintel ring tying the pillars together */}
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.76, 0.08, 0.76]} />
          <meshStandardMaterial color={STONE_COLOR} roughness={1} flatShading />
        </mesh>

        {/* flame */}
        <mesh ref={flameMeshRef} position={[0, 0.05, 0]}>
          <icosahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial
            ref={flameMaterialRef}
            color="#ff8a3d"
            emissive={flame.emissive}
            emissiveIntensity={0}
            roughness={0.6}
          />
        </mesh>
        <pointLight
          ref={flameLightRef}
          position={[0, 0.05, 0]}
          color={flame.color}
          intensity={0}
          distance={flame.distance}
          decay={2}
        />
      </group>

      {/* pyramidal roof */}
      <mesh position={[0, 1.95, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.72, 0.5, 4]} />
        <meshStandardMaterial color={STONE_COLOR_DARK} roughness={1} flatShading />
      </mesh>
      {/* finial */}
      <mesh position={[0, 2.28, 0]} castShadow>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={STONE_COLOR_DARK} roughness={1} flatShading />
      </mesh>
    </group>
  )
}
