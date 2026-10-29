import { createHash } from 'node:crypto';

/** SHA-256 of a UTF-8 string. Swapped for a browser-safe implementation in Phase 6. */
export function sha256(input: string): Uint8Array {
  return createHash('sha256').update(input, 'utf8').digest();
}

/** Inputs that differ only by case, surrounding space or Unicode form give the same emblem. */
export function normalizeInput(input: string): string {
  return input.normalize('NFC').trim().toLowerCase();
}

/** Short, fast, non-cryptographic hash. Used for SVG element ids, never for seeding. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
