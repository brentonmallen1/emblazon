import type { ThemeName } from '../index.ts';

/** jb-rpg's screen for each theme: background, accent, and the theme it stands for. */
export const LOOKS: Readonly<Record<ThemeName, { bg: string; accent: string; label: string }>> = {
  heraldry: { bg: '#1b120a', accent: '#d9a557', label: 'fantasy · coat of arms' },
  patch: { bg: '#0b0f1c', accent: '#f0b060', label: 'deep space · mission patch' },
  insignia: { bg: '#0a090b', accent: '#f2e64a', label: 'cyberpunk · crew tag' },
  sigil: { bg: '#0c0b0b', accent: '#e0574b', label: 'horror · sigil' },
  mark: { bg: '#0f0c14', accent: '#a9dc7e', label: "insanity · an idol, a tablet or a forbidden book" },
  badge: { bg: '#1a1a2e', accent: '#667eea', label: 'modern · badge' },
};
