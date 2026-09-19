import { POND_CENTER, pondEdgeRadius } from './pondShape'

export interface TreePlacement {
  seed: number
  position: [number, number, number]
  rotationY: number
  scale: number
}

// Extra trees planted just past the pond's shoreline/bush ring — close
// enough to overhang the water, on arcs clear of the lantern island (~2.05
// rad) and the main tree's own side of the pond.
function shorePosition(angle: number, margin: number): [number, number, number] {
  const dist = pondEdgeRadius(angle) + margin
  return [POND_CENTER[0] + Math.cos(angle) * dist, 0, POND_CENTER[1] + Math.sin(angle) * dist]
}

export const TREES: TreePlacement[] = [
  { seed: 7, position: [0, 0, 0], rotationY: 0, scale: 1 },
  { seed: 23, position: shorePosition(3.35, 1.05), rotationY: 1.1, scale: 0.72 },
  { seed: 51, position: shorePosition(1.7, 1.0), rotationY: -0.6, scale: 0.62 },
]
