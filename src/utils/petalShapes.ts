import * as THREE from 'three'

// Low-poly stylized silhouettes (flat, extruded via ShapeGeometry) so falling
// petals/leaves read as petal/leaf shapes instead of plain squares.

function shapeFromPoints(points: [number, number][]): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1])
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

// Sakura petal: narrow base, wide rounded body, small notch at the tip.
export function createPetalGeometry(): THREE.ShapeGeometry {
  return shapeFromPoints([
    [0, -0.5],
    [-0.32, -0.1],
    [-0.4, 0.28],
    [-0.1, 0.5],
    [0, 0.38],
    [0.1, 0.5],
    [0.4, 0.28],
    [0.32, -0.1],
  ])
}

// Simple pointed leaf.
export function createLeafGeometry(): THREE.ShapeGeometry {
  return shapeFromPoints([
    [0, -0.5],
    [-0.22, -0.2],
    [-0.3, 0.15],
    [-0.12, 0.42],
    [0, 0.55],
    [0.12, 0.42],
    [0.3, 0.15],
    [0.22, -0.2],
  ])
}
