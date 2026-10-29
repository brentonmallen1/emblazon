export type Pt = readonly [number, number];

/** Compact number formatting for path data: two decimals, no "-0". */
export function n(x: number): string {
  const r = Math.round(x * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

export const M = (p: Pt): string => `M${n(p[0])} ${n(p[1])}`;
export const L = (p: Pt): string => `L${n(p[0])} ${n(p[1])}`;

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
