/** Render options every theme understands. */
export interface RenderOptions {
  /** Pixel width/height attributes. Omit for a fluid SVG. */
  size?: number;
  /** 'shaded' adds a soft highlight and vignette. */
  finish?: 'flat' | 'shaded';
  /**
   * What the emblem will sit on. 'dark' adds a thin light rim outside the dark outline, so the
   * edge stays visible on near-black screens.
   */
  backdrop?: 'light' | 'dark';
  /** Rim colour for a dark backdrop, e.g. a theme's accent. Defaults to a warm off-white. */
  rim?: string;
}

export const DEFAULT_RIM = '#EDE6D6';
