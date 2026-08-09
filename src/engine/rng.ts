/**
 * Seeded pseudo-random number generator.
 *
 * Every random decision in the game flows through here so that a save file plus
 * a seed reproduces the same season exactly. That makes the match engine
 * testable and stops save-scumming by reloading a match.
 */
export class Rng {
  private state: number

  constructor(seed: number | string) {
    this.state = typeof seed === 'string' ? Rng.hash(seed) : seed >>> 0
    // Avoid the zero state, which is a fixed point for xorshift.
    if (this.state === 0) this.state = 0x9e3779b9
  }

  static hash(s: string): number {
    let h = 2166136261 >>> 0
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }

  /** Uniform float in [0, 1). */
  next(): number {
    // xorshift32
    let x = this.state
    x ^= x << 13
    x >>>= 0
    x ^= x >> 17
    x ^= x << 5
    x >>>= 0
    this.state = x
    return x / 0x100000000
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** Uniform float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** True with the given probability. */
  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]
  }

  /** Weighted pick. Weights need not sum to 1. Returns null for an empty or zero-weight list. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T | null {
    let total = 0
    for (const item of items) total += Math.max(0, weight(item))
    if (total <= 0) return null
    let roll = this.next() * total
    for (const item of items) {
      roll -= Math.max(0, weight(item))
      if (roll <= 0) return item
    }
    return items[items.length - 1] ?? null
  }

  /** Approximately normal via the sum of three uniforms; clamped at ±3 sd. */
  normal(mean: number, sd: number): number {
    const u = this.next() + this.next() + this.next() - 1.5
    return mean + u * sd * 1.1547
  }

  shuffle<T>(items: T[]): T[] {
    const out = items.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  /** Serialise so a save file can resume the exact stream. */
  getState(): number {
    return this.state
  }

  setState(state: number): void {
    this.state = state >>> 0
  }
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}
