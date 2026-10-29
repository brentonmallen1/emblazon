import type { Pt } from '../../core/svg.ts';

// All heraldic geometry is authored in field coordinates: a 200×220 box with y pointing down.
export const FIELD_W = 200;
export const FIELD_H = 220;

/** Centre of the shield (the fess point). */
export const FESS: Pt = [100, 100];

/** Shapes overshoot the field by this much on every side and rely on the shield clip. */
export const BLEED = 40;
export const LEFT = -BLEED;
export const TOP = -BLEED;
export const RIGHT = FIELD_W + BLEED;
export const BOTTOM = FIELD_H + BLEED;

/** The rendered canvas is square; the field sits inside it at FIELD_OFFSET. */
export const CANVAS = 240;
export const FIELD_OFFSET: Pt = [20, 10];
