import { L, n, type Pt } from '../../core/svg.ts';

export const LINE_STYLES = ['straight', 'wavy', 'indented', 'dancetty', 'embattled', 'engrailed', 'invected'] as const;
export type LineStyle = (typeof LINE_STYLES)[number];

/** Nominal repeat length and half-height of each pattern, in field units. */
const PATTERNS: Readonly<Record<Exclude<LineStyle, 'straight'>, { period: number; amp: number }>> = {
  wavy: { period: 44, amp: 8 },
  indented: { period: 16, amp: 5 },
  dancetty: { period: 50, amp: 14 },
  embattled: { period: 30, amp: 8 },
  engrailed: { period: 30, amp: 0 },
  invected: { period: 30, amp: 0 },
};

/**
 * Path commands for a line of partition from `a` to `b`. The pen must already be at `a`, and
 * the output ends exactly at `b`, so edges chain into closed shapes and meet cleanly at corners.
 * Every pattern starts and ends on the nominal line and is centred on it.
 *
 * Orientation matters for engrailed/invected: the normal (-dy, dx) points into a shape traced
 * clockwise on screen, so trace every shape clockwise and engrailed points face outward.
 */
export function edge(a: Pt, b: Pt, style: LineStyle): string {
  if (style === 'straight') return L(b);

  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const { period, amp } = PATTERNS[style];
  const k = Math.max(1, Math.round(len / period));
  const w = len / k;
  const ux = dx / len;
  const uy = dy / len;
  // s = distance along the line, o = offset along the inward normal.
  const at = (s: number, o: number) => `${n(a[0] + ux * s - uy * o)} ${n(a[1] + uy * s + ux * o)}`;

  let d = '';
  for (let i = 0; i < k; i++) {
    const s = i * w;
    switch (style) {
      case 'wavy':
        // Alternating parabolas (a quadratic peaks at half its control offset); tangents match
        // at every crossing, so the line reads as one smooth wave.
        d += `Q${at(s + w / 4, amp * 2)} ${at(s + w / 2, 0)}Q${at(s + (3 * w) / 4, -amp * 2)} ${at(s + w, 0)}`;
        break;
      case 'indented':
      case 'dancetty':
        d += `L${at(s + w / 4, amp)}L${at(s + (3 * w) / 4, -amp)}L${at(s + w, 0)}`;
        break;
      case 'embattled':
        d += `L${at(s, amp)}L${at(s + w / 2, amp)}L${at(s + w / 2, -amp)}L${at(s + w, -amp)}L${at(s + w, 0)}`;
        break;
      case 'engrailed':
      case 'invected': {
        // Sweep 0 bulges toward the inward normal: the curves bite into the shape.
        const r = n(w * 0.56);
        d += `A${r} ${r} 0 0 ${style === 'engrailed' ? 0 : 1} ${at(s + w, 0)}`;
        break;
      }
    }
  }
  return d;
}
