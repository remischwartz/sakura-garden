import * as THREE from 'three'
import { POND_CENTER, pondEdgeRadius } from './pondShape'

// Ring buffer of recent things landing on the water (petals, leaves), shared
// between the particle system (writer) and the pond ripple shader (reader).
// Each entry is (x, y, time) with x/y in the pond overlay's local space.
export const MAX_IMPACTS = 24
export const IMPACT_LIFETIME = 3

export const impacts: THREE.Vector3[] = Array.from({ length: MAX_IMPACTS }, () => new THREE.Vector3(0, 0, -1e4))
let next = 0

// Registers a ripple if the world-space point (x, z) is over the water.
export function addPondImpact(x: number, z: number, time: number) {
  const dx = x - POND_CENTER[0]
  const dz = z - POND_CENTER[1]
  if (Math.hypot(dx, dz) > pondEdgeRadius(Math.atan2(dz, dx))) return
  // The overlay mesh is rotated -90° about X, so its local y is -world z.
  impacts[next].set(dx, -dz, time)
  next = (next + 1) % MAX_IMPACTS
}
