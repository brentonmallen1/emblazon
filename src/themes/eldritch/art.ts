/** What every subject's art needs besides its own config. */
export interface ArtContext {
  /** Unique per emblem, for ids inside the SVG. */
  id: string;
  glow: string;
  /** ` class="…"` for glowing parts when animated, else empty. */
  glowAttr: string;
  /** For detail you don't notice at avatar size. */
  seed: number;
}

/** Mirror across the canvas's vertical centre line. */
export const MIRROR = 'matrix(-1 0 0 1 240 0)';
