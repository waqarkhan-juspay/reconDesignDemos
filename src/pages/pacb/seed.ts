/**
 * Seeded randomness for the module's generated demo data — the same rows on every reload.
 * (data.ts keeps its own older generator: swapping it would change every row it has drawn.)
 */

/** mulberry32. */
export const seeded = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** A stable seed from an ID, so whatever is generated for it is the same on every visit. */
export const seedOf = (id: string) =>
  [...id].reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) | 0, 7)

export const hex = (rand: () => number, length: number) =>
  Array.from({ length }, () => Math.floor(rand() * 16).toString(16)).join('')

/** A v4-shaped UUID drawn from `rand`. */
export const uuid = (rand: () => number) =>
  `${hex(rand, 8)}-${hex(rand, 4)}-4${hex(rand, 3)}-${'89ab'[Math.floor(rand() * 4)]}${hex(rand, 3)}-${hex(rand, 12)}`

export const digits = (rand: () => number, length: number) =>
  Array.from({ length }, () => Math.floor(rand() * 10)).join('')
