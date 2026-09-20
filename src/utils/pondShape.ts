import * as THREE from 'three'

// Single source of truth for the pond's (irregular, natural-looking)
// footprint, shared by the water surface, the ground fade-out, and bush
// placement so everything lines up.
export const POND_CENTER: [number, number] = [2.6, -2.6]
export const POND_RADIUS = 3.1
// Water sits below the surrounding ground; the basin floor is deeper still.
export const POND_WATER_Y = -0.22
export const POND_DEPTH = 0.5

// World-space wind direction: from the main tree (world origin) toward the
// pond, normalized. Shared by falling petals/leaves and canopy sway so the
// whole garden's wind reads as one consistent breeze.
export const WIND_DIRECTION: [number, number] = (() => {
  const len = Math.hypot(POND_CENTER[0], POND_CENTER[1])
  return [POND_CENTER[0] / len, POND_CENTER[1] / len]
})()

// Radius of the pond's edge at a given world-space angle (measured the same
// way as atan2(z - centerZ, x - centerX)), wobbled with a few harmonics so
// the shoreline reads as a natural pond instead of a perfect circle.
export function pondEdgeRadius(angle: number): number {
  return (
    POND_RADIUS *
    (1 +
      0.09 * Math.sin(angle * 2 + 0.6) +
      0.11 * Math.sin(angle * 3 + 2.3) +
      0.05 * Math.sin(angle * 5 + 4.1))
  )
}

// Flat water-surface geometry in the reflector's local XY plane (it gets
// rotated -90deg on X like any other flat ground mesh). Built from the same
// pondEdgeRadius() used for placement so the shoreline matches everywhere.
export function createPondShapeGeometry(segments = 96): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const r = pondEdgeRadius(angle)
    const x = r * Math.cos(angle)
    const y = -r * Math.sin(angle)
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return new THREE.ShapeGeometry(shape, 1)
}

// A point at `fraction` of the shoreline distance along `angle`, as an
// [x, z] offset from the pond center (group-local space).
export function pondPointAt(angle: number, fraction: number): [number, number] {
  const r = pondEdgeRadius(angle) * fraction
  return [r * Math.cos(angle), r * Math.sin(angle)]
}

// Height at which falling things come to rest at world (x, z): the water
// surface over the pond, the ground elsewhere.
export function restHeightAt(x: number, z: number): number {
  const dx = x - POND_CENTER[0]
  const dz = z - POND_CENTER[1]
  return Math.hypot(dx, dz) < pondEdgeRadius(Math.atan2(dz, dx)) ? POND_WATER_Y : 0.02
}
