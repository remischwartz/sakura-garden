import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WIND_DIRECTION } from '../utils/pondShape'

// Cheap GPU rain: thousands of instanced streak quads, all animation done in
// the vertex shader (no per-frame CPU work). Each streak is stretched along
// its fall direction and billboarded around it, with a soft head-to-tail
// alpha gradient so it reads as motion-blurred droplets.
const COUNT = 6000
const AREA = 26 // side of the square rain volume (world units)
const HEIGHT = 9
const CENTER: [number, number] = [1.2, -1.2]
const STREAK_LENGTH = 0.7
const STREAK_WIDTH = 0.014
const FALL_SPEED = 11

const vertexShader = /* glsl */ `
  attribute vec4 aSeed; // x, z offset in [0,1], phase, speed variation
  uniform float uTime;
  uniform float uArea;
  uniform float uHeight;
  uniform vec2 uCenter;
  uniform vec2 uSlant;   // horizontal drift per unit of fall
  uniform float uSpeed;
  uniform float uLength;
  uniform float uWidth;
  varying vec2 vUv;
  varying float vFade;

  void main() {
    vUv = uv;
    float speed = uSpeed * (0.85 + aSeed.w * 0.3);
    float p = fract(aSeed.z + uTime * speed / uHeight);
    float y = uHeight * (1.0 - p);

    vec3 head = vec3(
      uCenter.x + (aSeed.x - 0.5) * uArea + uSlant.x * (uHeight - y),
      y,
      uCenter.y + (aSeed.y - 0.5) * uArea + uSlant.y * (uHeight - y)
    );
    vec3 dir = normalize(vec3(uSlant.x, -1.0, uSlant.y));
    vec3 tail = head - dir * uLength;

    vec4 vh = viewMatrix * vec4(head, 1.0);
    vec4 vt = viewMatrix * vec4(tail, 1.0);

    // Widen perpendicular to the streak on screen.
    vec2 axis = vh.xy - vt.xy;
    vec2 side = normalize(vec2(-axis.y, axis.x) + 1e-5) * uWidth;

    // uv.y: 1 at the head, 0 at the tail.
    vec4 v = mix(vt, vh, uv.y);
    v.xy += side * (uv.x - 0.5) * 2.0;

    // Fade in at the top of the volume, vanish at the ground.
    vFade = smoothstep(0.0, 0.08, p) * smoothstep(0.0, 0.5, y) * smoothstep(2.0, 6.0, -vh.z);
    gl_Position = projectionMatrix * v;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vFade;

  void main() {
    float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
    float along = pow(vUv.y, 1.5);
    float a = sqrt(across) * along * uOpacity * vFade;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

function createSeeds() {
  const seeds = new Float32Array(COUNT * 4)
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
  return seeds
}

export function Rain() {
  const { geometry, uniforms } = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1)
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = base.index
    geo.setAttribute('position', base.getAttribute('position'))
    // uv.y = 1 at the head, 0 at the tail (plane's v runs bottom→top).
    geo.setAttribute('uv', base.getAttribute('uv'))

    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(createSeeds(), 4))
    geo.instanceCount = COUNT

    // Gentle slant so the rain leans with the garden's wind.
    const slant = 0.12
    return {
      geometry: geo,
      uniforms: {
        uTime: { value: 0 },
        uArea: { value: AREA },
        uHeight: { value: HEIGHT },
        uCenter: { value: new THREE.Vector2(CENTER[0], CENTER[1]) },
        uSlant: { value: new THREE.Vector2(WIND_DIRECTION[0] * slant, WIND_DIRECTION[1] * slant) },
        uSpeed: { value: FALL_SPEED },
        uLength: { value: STREAK_LENGTH },
        uWidth: { value: STREAK_WIDTH },
        uColor: { value: new THREE.Color('#dbe8f5') },
        uOpacity: { value: 0.7 },
      },
    }
  }, [])

  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value = clock.getElapsedTime()
    material.uniformsNeedUpdate = true
  })

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={10}>
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
