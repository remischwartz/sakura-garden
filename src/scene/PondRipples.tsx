import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createPondShapeGeometry } from '../utils/pondShape'
import { IMPACT_LIFETIME, MAX_IMPACTS, impacts } from '../utils/pondImpacts'
import { useSceneStore } from '../store'

// Raindrop impacts on the water: a transparent overlay on the pond surface
// where every cell of a jittered grid spawns expanding, fading rings on its
// own loop. Pure fragment-shader work, so it costs nothing on the CPU.
const CELL = 0.6 // grid cell size (world units)
const MAX_RADIUS = 0.5

const vertexShader = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uCell;
  uniform float uMaxRadius;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRain;
  uniform vec3 uImpacts[${MAX_IMPACTS}];
  varying vec2 vPos;

  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  void main() {
    vec2 g = vPos / uCell;
    vec2 cell = floor(g);
    float a = 0.0;

    // Petals / leaves landing on the water: a wider, slower double ring.
    for (int k = 0; k < ${MAX_IMPACTS}; k++) {
      float age = uTime - uImpacts[k].z;
      if (age < 0.0 || age > ${IMPACT_LIFETIME.toFixed(2)}) continue;
      float life = age / ${IMPACT_LIFETIME.toFixed(2)};
      float d = length(vPos - uImpacts[k].xy);
      float fade = (1.0 - life) * (1.0 - life);
      float w = 0.02 + life * 0.025;
      a += smoothstep(w, 0.0, abs(d - life * 0.55)) * fade;
      a += smoothstep(w, 0.0, abs(d - life * 0.32)) * fade * 0.6;
    }

    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        if (uRain < 0.5) continue;
        vec2 c = cell + vec2(float(i), float(j));
        vec2 h = hash22(c);
        vec2 h2 = hash22(c + 17.0);
        float period = 0.7 + h2.x * 0.9;
        float life = fract(uTime / period + h.x * 7.0);
        // Each loop drops at a fresh spot within the cell.
        float loopId = floor(uTime / period + h.x * 7.0);
        vec2 spot = hash22(c + loopId * 1.7 + 3.0);
        // Only some cells are active at a time so it stays sparse.
        if (h2.y > 0.6) continue;

        float d = length((g - c - spot) * uCell);
        float r = life * uMaxRadius;
        float width = 0.02 + life * 0.02;
        float ring = smoothstep(width, 0.0, abs(d - r));
        a += ring * (1.0 - life) * (1.0 - life);
      }
    }

    a = clamp(a, 0.0, 1.0) * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

export function PondRipples({ rain }: { rain: boolean }) {
  const geometry = useMemo(() => createPondShapeGeometry(96), [])
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const isNight = useSceneStore((s) => s.isNight)
  

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCell: { value: CELL },
      uMaxRadius: { value: MAX_RADIUS },
      uColor: { value: new THREE.Color(isNight ? '#707070' : '#e8f1fa') },
      uOpacity: { value: 1.0 },
      uRain: { value: 0 },
      uImpacts: { value: impacts },
    }),
    [isNight],
  )

  useFrame(({ clock }) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uRain.value = rain ? 1 : 0
    material.uniforms.uTime.value = clock.getElapsedTime()
    material.uniformsNeedUpdate = true
  })

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} renderOrder={5}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
