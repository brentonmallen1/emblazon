/**
 * Minimal SVG path toolkit for importing third-party icons: parse any path data, convert it to
 * absolute commands, apply a uniform scale + translate, measure it, and serialise it again.
 * Uniform scaling keeps arcs and smooth-curve reflections valid without re-deriving them.
 */
import { n } from './svg.ts';

export interface Command {
  /** Absolute command: M L C S Q T A Z (H and V are converted to L). */
  c: string;
  v: number[];
}

const ARITY: Readonly<Record<string, number>> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;

/** Parses path data into absolute commands. Throws on anything malformed. */
export function parsePath(d: string): Command[] {
  const out: Command[] = [];
  let i = 0;
  let cmd = '';
  let [x, y, sx, sy] = [0, 0, 0, 0];

  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++;
  };
  const num = (): number => {
    skip();
    const m = d.slice(i).match(NUMBER);
    if (!m) throw new Error(`expected a number at ${i}: "${d.slice(i, i + 12)}"`);
    i += m[0].length;
    return Number(m[0]);
  };
  // Arc flags are single digits and may be written without separators ("a5 5 0 01 10 10").
  const flag = (): number => {
    skip();
    const ch = d[i++];
    if (ch !== '0' && ch !== '1') throw new Error(`expected an arc flag at ${i - 1}`);
    return Number(ch);
  };

  while (true) {
    skip();
    if (i >= d.length) break;
    if (/[a-zA-Z]/.test(d[i])) cmd = d[i++];
    else if (!cmd) throw new Error(`path must start with a command`);
    const upper = cmd.toUpperCase();
    const rel = cmd !== upper;
    if (!(upper in ARITY)) throw new Error(`unsupported command "${cmd}"`);

    if (upper === 'Z') {
      out.push({ c: 'Z', v: [] });
      [x, y] = [sx, sy];
      cmd = '';
      continue;
    }

    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (upper) {
      case 'M': {
        const p = [num() + ox, num() + oy];
        out.push({ c: 'M', v: p });
        [x, y, sx, sy] = [p[0], p[1], p[0], p[1]];
        cmd = rel ? 'l' : 'L'; // further pairs after a moveto are linetos
        break;
      }
      case 'L':
      case 'T': {
        const p = [num() + ox, num() + oy];
        out.push({ c: upper, v: p });
        [x, y] = p;
        break;
      }
      case 'H': {
        x = num() + ox;
        out.push({ c: 'L', v: [x, y] });
        break;
      }
      case 'V': {
        y = num() + oy;
        out.push({ c: 'L', v: [x, y] });
        break;
      }
      case 'C':
      case 'S':
      case 'Q': {
        const v: number[] = [];
        for (let k = 0; k < ARITY[upper] / 2; k++) v.push(num() + ox, num() + oy);
        out.push({ c: upper, v });
        [x, y] = v.slice(-2);
        break;
      }
      case 'A': {
        const v = [num(), num(), num(), flag(), flag(), num() + ox, num() + oy];
        out.push({ c: 'A', v });
        [x, y] = v.slice(-2);
        break;
      }
    }
  }
  return out;
}

/** Applies x' = x·s + tx, y' = y·s + ty (s > 0). */
export function transformPath(cmds: readonly Command[], s: number, tx: number, ty: number): Command[] {
  return cmds.map(({ c, v }) => {
    if (c === 'A') return { c, v: [v[0] * s, v[1] * s, v[2], v[3], v[4], v[5] * s + tx, v[6] * s + ty] };
    return { c, v: v.map((value, k) => (k % 2 === 0 ? value * s + tx : value * s + ty)) };
  });
}

/**
 * Bounding box of every end and control point. Control points can overshoot the curve a little,
 * so this errs on the large side, which is the safe side for fitting into a box.
 */
export function pathBounds(cmds: readonly Command[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const { c, v } of cmds) {
    const coords = c === 'A' ? v.slice(5) : v;
    for (let k = 0; k < coords.length; k += 2) {
      b.minX = Math.min(b.minX, coords[k]);
      b.maxX = Math.max(b.maxX, coords[k]);
      b.minY = Math.min(b.minY, coords[k + 1]);
      b.maxY = Math.max(b.maxY, coords[k + 1]);
    }
  }
  return b;
}

export function serializePath(cmds: readonly Command[]): string {
  return cmds
    .map(({ c, v }) => {
      if (c === 'A') return `A${n(v[0])} ${n(v[1])} ${n(v[2])} ${v[3]} ${v[4]} ${n(v[5])} ${n(v[6])}`;
      return c + v.map(n).join(' ');
    })
    .join('');
}
