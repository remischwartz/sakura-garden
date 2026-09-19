// Cheap organic 1D noise built from a handful of irrational-frequency sine
// waves. Good enough for flame flicker / wind gusts without pulling in a
// full simplex-noise dependency.
export function valueNoise1D(t: number, seed = 0): number {
  const a = Math.sin(t * 1.7 + seed * 12.9898) * 0.5
  const b = Math.sin(t * 3.13 + seed * 78.233 + 1.5) * 0.3
  const c = Math.sin(t * 6.7 + seed * 37.719 + 3.1) * 0.2
  return (a + b + c) * 0.5 + 0.5 // normalized 0..1
}

export function smoothRandom(t: number, seed = 0): number {
  return valueNoise1D(t, seed) * 2 - 1 // -1..1
}
