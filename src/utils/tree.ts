// Deterministic pseudo-random generator so the tree shape is stable across
// re-renders / hot reloads instead of jumping around every mount.
function mulberry32(seed: number) {
  return function rng() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Branch {
  start: [number, number, number]
  end: [number, number, number]
  radiusStart: number
  radiusEnd: number
}

export interface TreeData {
  branches: Branch[]
  tips: [number, number, number][]
}

interface Node {
  pos: [number, number, number]
  dir: [number, number, number]
  radius: number
  depth: number
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}

function rotateAroundAxis(
  v: [number, number, number],
  axis: [number, number, number],
  angle: number,
): [number, number, number] {
  const [x, y, z] = v
  const [ax, ay, az] = normalize(axis)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dot = ax * x + ay * y + az * z
  return [
    x * cos + (ay * z - az * y) * sin + ax * dot * (1 - cos),
    y * cos + (az * x - ax * z) * sin + ay * dot * (1 - cos),
    z * cos + (ax * y - ay * x) * sin + az * dot * (1 - cos),
  ]
}

const treeCache = new Map<number, TreeData>()

export function generateSakuraTree(seed = 1): TreeData {
  let data = treeCache.get(seed)
  if (!data) {
    data = buildSakuraTree(seed)
    treeCache.set(seed, data)
  }
  return data
}

function buildSakuraTree(seed: number): TreeData {
  const rng = mulberry32(seed)
  const branches: Branch[] = []
  const tips: [number, number, number][] = []

  const maxDepth = 5

  function grow(node: Node) {
    const lengthBase = 1.15 * Math.pow(0.72, node.depth)
    const length = lengthBase * (0.85 + rng() * 0.3)
    // Sakura trunks/branches characteristically kink and twist.
    const kinkAxis: [number, number, number] = [rng() - 0.5, rng() - 0.5, rng() - 0.5]
    const kinkAngle = (rng() - 0.5) * (node.depth === 0 ? 0.5 : 0.7)
    const dir = normalize(rotateAroundAxis(node.dir, kinkAxis, kinkAngle))

    const end: [number, number, number] = [
      node.pos[0] + dir[0] * length,
      node.pos[1] + dir[1] * length,
      node.pos[2] + dir[2] * length,
    ]
    const radiusEnd = node.radius * 0.7
    branches.push({ start: node.pos, end, radiusStart: node.radius, radiusEnd })

    if (node.depth >= maxDepth) {
      tips.push(end)
      return
    }

    const childCount = node.depth === 0 ? 2 : rng() > 0.35 ? 2 : 3
    const up: [number, number, number] = [0, 1, 0]
    let spreadAxis = normalize([dir[2], 0, -dir[0]])
    if (Math.hypot(spreadAxis[0], spreadAxis[1], spreadAxis[2]) < 0.1) {
      spreadAxis = [1, 0, 0]
    }

    for (let i = 0; i < childCount; i++) {
      const spread = 0.45 + rng() * 0.55
      const rotated = rotateAroundAxis(dir, spreadAxis, spread * (i % 2 === 0 ? 1 : -1))
      const twisted = rotateAroundAxis(rotated, up, rng() * Math.PI * 2)
      // bias upward so the canopy doesn't droop into the ground
      const biased = normalize([twisted[0], twisted[1] + 0.35, twisted[2]])
      grow({ pos: end, dir: biased, radius: radiusEnd, depth: node.depth + 1 })
    }
  }

  grow({ pos: [0, 0, 0], dir: [0.15, 1, 0.05], radius: 0.24, depth: 0 })

  return { branches, tips }
}
