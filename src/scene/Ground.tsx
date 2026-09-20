import { useMemo } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'
import { useSceneStore } from '../store'
import { tint } from '../debug'
import { SEASON_THEME } from '../theme'
import { POND_CENTER, POND_RADIUS, pondEdgeRadius } from '../utils/pondShape'

export { POND_CENTER, POND_RADIUS }

// A gently undulating disc of ground so the flat-shaded low-poly look
// doesn't read as a perfectly flat plane.
function useBumpyDiscGeometry(radius: number, segments: number) {
  return useMemo(() => {
    const geometry = new THREE.CircleGeometry(radius, segments)
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
      const pondFade = 1 - THREE.MathUtils.smoothstep(pondDist, shoreRadius, shoreRadius + 1.2)
      position.setZ(i, bump * (1 - edgeFade) * pondFade)
    }
    geometry.computeVertexNormals()
    return geometry
  }, [radius, segments])
}

export function Ground() {
  const season = useSceneStore((s) => s.season)
  const isNight = useSceneStore((s) => s.isNight)
  const theme = SEASON_THEME[season]
  const geometry = useBumpyDiscGeometry(30, 72)

  const ground = useControls('Ground', {
    tint: { value: '#ffffff' },
    roughness: { value: 1, min: 0, max: 1, step: 0.01 },
    metalness: { value: 0, min: 0, max: 1, step: 0.01 },
    flatShading: true,
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
