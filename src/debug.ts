import * as THREE from 'three'
import { levaStore } from 'leva'

const a = new THREE.Color()
const b = new THREE.Color()

// Multiply a base color by a debug tint (white tint = unchanged).
export function tint(base: string, tintColor: string): THREE.Color {
  return new THREE.Color().copy(a.set(base)).multiply(b.set(tintColor))
}

// Rotate a light position by azimuth / elevation offsets (degrees).
export function orbit(
  pos: [number, number, number],
  azimuthDeg: number,
  elevationDeg: number,
): [number, number, number] {
  const [x, y, z] = pos
  const r = Math.hypot(x, y, z)
  const theta = Math.atan2(z, x) + THREE.MathUtils.degToRad(azimuthDeg)
  const phi = THREE.MathUtils.clamp(
    Math.asin(y / r) + THREE.MathUtils.degToRad(elevationDeg),
    0.02,
    Math.PI / 2,
  )
  return [r * Math.cos(phi) * Math.cos(theta), r * Math.sin(phi), r * Math.cos(phi) * Math.sin(theta)]
}

// Reset every Leva control (except the camera, which isn't season-related)
// back to its default value.
export function resetDebugParams() {
  const values: Record<string, unknown> = {}
  const data = levaStore.getData() as Record<string, { initialValue?: unknown }>
  for (const [path, item] of Object.entries(data)) {
    if (path.startsWith('Camera.') || !('initialValue' in item)) continue
    values[path] = item.initialValue
  }
  levaStore.set(values, false)
}
