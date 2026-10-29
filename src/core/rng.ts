import { sha256 } from './hash.ts';

/** Returns a float in [0, 1). */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32-bit seed from the first four bytes of sha256(parts joined by ':'). */
export function seedFrom(...parts: readonly (string | number)[]): number {
  const h = sha256(parts.join(':'));
  return ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0;
}

/**
 * An independent stream per slot, e.g. rngFor('v1', 'heraldry', 'field', input).
 * Adding a slot never changes what existing slots draw.
 */
export function rngFor(...parts: readonly (string | number)[]): Rng {
  return mulberry32(seedFrom(...parts));
}

/** Integer in [min, max], inclusive. */
export function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick from empty list');
  return items[Math.floor(rng() * items.length)];
}

/** Picks a key with probability proportional to its weight. Key order is part of the contract. */
export function weighted<K extends string>(rng: Rng, table: Readonly<Record<K, number>>): K {
  const entries = Object.entries(table) as [K, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (!(total > 0)) throw new Error('weighted pick needs a positive total weight');
  let x = rng() * total;
  for (const [key, w] of entries) {
    x -= w;
    if (x < 0) return key;
  }
  // Floating-point slack: fall back to the last key with any weight.
  return entries.findLast(([, w]) => w > 0)![0];
}
