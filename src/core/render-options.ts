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
  /**
   * 'flat': muted theme colours, no shading, light outline (the look of jb-rpg's symbols).
   * 'classic': the original bright, shaded look. Defaults to whatever the theme version was
   * released with, so pinned versions never change.
   */
  style?: 'flat' | 'classic';
  /**
   * Gentle built-in motion (CSS inside the SVG, paused under prefers-reduced-motion) for themes
   * that have it, e.g. the eldritch relic (insanity theme). Off by default; static renderers show the still frame.
   */
  animate?: boolean;
}

export const DEFAULT_RIM = '#EDE6D6';
