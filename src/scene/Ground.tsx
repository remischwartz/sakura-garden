import { useMemo } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'
import { useSceneStore } from '../store'
import { tint } from '../debug'
import { SEASON_THEME } from '../theme'
import { POND_CENTER, POND_RADIUS, POND_DEPTH, pondEdgeRadius } from '../utils/pondShape'

export { POND_CENTER, POND_RADIUS }

// A gently undulating disc of ground so the flat-shaded low-poly look
// doesn't read as a perfectly flat plane. The pond sits in a shallow basin
// carved into it (water level is POND_WATER_Y).
function useBumpyDiscGeometry(radius: number) {
  return useMemo(() => {
    // Polar grid (not a fan) so there are enough vertices to sculpt the basin.
    const geometry = new THREE.RingGeometry(0.01, radius, 144, 90)
    const position = geometry.attributes.position as THREE.BufferAttribute
    const [pondX, pondZ] = POND_CENTER
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const d = Math.sqrt(x * x + y * y)
      const bump =
        Math.sin(x * 0.4) * Math.cos(y * 0.35) * 0.12 +
        Math.sin(d * 0.6) * 0.05
      const edgeFade = THREE.MathUtils.smoothstep(d, radius - 3, radius)
      const dx = x - pondX
      const dz = -y - pondZ // world z = -local y
      const pondDist = Math.sqrt(dx * dx + dz * dz)
      const pondAngle = Math.atan2(dz, dx)
      const shoreRadius = pondEdgeRadius(pondAngle)
      const basin = THREE.MathUtils.smoothstep(pondDist - shoreRadius, -0.6, 0.6)
      const height = bump * (1 - edgeFade)
      position.setZ(i, THREE.MathUtils.lerp(-POND_DEPTH, height, basin))
    }
    geometry.computeVertexNormals()
    return geometry
  }, [radius])
}

export function Ground() {
  const season = useSceneStore((s) => s.season)
  const isNight = useSceneStore((s) => s.isNight)
  const theme = SEASON_THEME[season]
  const geometry = useBumpyDiscGeometry(30)

  const ground = useControls('Ground', {
    tint: { value: '#ffffff' },
    roughness: { value: 1, min: 0, max: 1, step: 0.01 },
    metalness: { value: 0, min: 0, max: 1, step: 0.01 },
    flatShading: false,
  }, { collapsed: true })

  const color = tint(isNight ? theme.groundColorNight : theme.groundColor, ground.tint)

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={ground.roughness}
        metalness={ground.metalness}
        flatShading={ground.flatShading}
      />
    </mesh>
  )
}
