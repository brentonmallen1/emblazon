/** Cyberpunk crew tag configs: three sub-styles sharing a palette, a two-character mark and a serial. */

export const INSIGNIA_STYLES = ['hazard', 'neon', 'stamp'] as const;
export type InsigniaStyle = (typeof INSIGNIA_STYLES)[number];

export const INSIGNIA_PALETTES = ['sodium', 'ice', 'magenta', 'acid', 'blaze', 'chrome', 'ultraviolet', 'jade'] as const;
export type InsigniaPalette = (typeof INSIGNIA_PALETTES)[number];

export const HAZARD_SHAPES = ['clipped', 'notched', 'tab', 'hex', 'bevel'] as const;
export type HazardShape = (typeof HAZARD_SHAPES)[number];

export const NEON_SHAPES = ['notched', 'clipped', 'hex', 'bevel'] as const;
export type NeonShape = (typeof NEON_SHAPES)[number];

export const STAMP_SHAPES = ['corner', 'double', 'notch'] as const;
export type StampShape = (typeof STAMP_SHAPES)[number];

interface TagBase {
  palette: InsigniaPalette;
  /** The big two characters: a capital, then a capital or a digit, e.g. ["W", "A"] or ["K", "9"]. */
  mark: readonly [string, string];
  /** Small printed code, e.g. "SM-07". */
  serial: string;
  /** Barcode bar widths, in order; gaps are fixed. */
  barcode: readonly number[];
}

/** A: a solid neon tag printed in black ink (jb-rpg's mock-up). */
export interface HazardTag extends TagBase {
  style: 'hazard';
  shape: HazardShape;
  /** What sits between the two characters. */
  join: 'slash' | 'none' | 'dot';
  /** Beside the barcode: the serial, or a block of hazard stripes. */
  footer: 'serial' | 'stripes';
  light: 'square' | 'circle' | 'none';
}

/** B: a dark tag drawn in glowing neon tubes. */
export interface NeonTag extends TagBase {
  style: 'neon';
  shape: NeonShape;
  /** Camera-style corner brackets around the tag. */
  brackets: boolean;
  /** A 2 × 6 block of data bits, as a 12-bit mask (bit 0 top-left, row by row). */
  bits: number;
}

/** C: a square corporate stamp, neon frame on black, with a vertical barcode. */
export interface StampTag extends TagBase {
  style: 'stamp';
  shape: StampShape;
  /** Along the bottom: hazard stripes or a ruler of ticks. */
  footer: 'stripes' | 'ticks';
}

export type Insignia = HazardTag | NeonTag | StampTag;
