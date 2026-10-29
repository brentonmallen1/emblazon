import { n } from '../../core/svg.ts';
import type { PatchPalette } from './frame.ts';
import type { Vehicle } from './types.ts';

/** Muted metal and foil; everything else comes from the palette. */
const METAL = '#8E97A8';
const FOIL = '#C9963F';

/**
 * A craft drawn pointing up in local coordinates, roughly centred on the origin. Flat: light
 * hull, accent details, windows cut in the sky colour, thin light lines for legs and booms.
 * The renderer places, scales and rotates it.
 */
export function vehicleArt(v: Vehicle, palette: PatchPalette): string {
  const hull = palette.thread;
  const accent = palette.accent;
  const glass = palette.inner;
  const fill = (d: string, color: string) => `<path d="${d}" fill="${color}"/>`;
  const line = (d: string, width: number, color = hull) =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const flame = (x: number, y: number, s: number) =>
    fill(`M${n(x - 8 * s)} ${n(y)}Q${n(x - 10 * s)} ${n(y + 24 * s)} ${n(x)} ${n(y + 40 * s)}Q${n(x + 10 * s)} ${n(y + 24 * s)} ${n(x + 8 * s)} ${n(y)}Z`, accent) +
    fill(`M${n(x - 4 * s)} ${n(y)}Q${n(x - 5 * s)} ${n(y + 14 * s)} ${n(x)} ${n(y + 24 * s)}Q${n(x + 5 * s)} ${n(y + 14 * s)} ${n(x + 4 * s)} ${n(y)}Z`, hull);
  const bell = (x: number, y: number, s: number) => fill(`M${n(x - 7 * s)} ${n(y)}H${n(x + 7 * s)}L${n(x + 10 * s)} ${n(y + 9 * s)}H${n(x - 10 * s)}Z`, METAL);

  switch (v.kind) {
    case 'rocket': {
      const hw = 14;
      let out = '';
      if (v.boosters) {
        for (const side of [-1, 1]) {
          const x0 = side * (hw + 3);
          const x1 = side * (hw + 13);
          const xm = (x0 + x1) / 2;
          if (v.flame) out += flame(xm, 46, 0.55);
          out += bell(xm, 40, 0.5) + fill(`M${x0} 40V0L${xm} -14L${x1} 0V40Z`, hull);
        }
      }
      if (v.flame) out += flame(0, 49, 1);
      out += bell(0, 40, 1);
      if (v.fins !== 'none') {
        const fin = (s: number) =>
          v.fins === 'delta' ? `M${s * hw} 16L${s * (hw + 17)} 46L${s * hw} 40Z` : `M${s * hw} 8L${s * (hw + 15)} 30L${s * (hw + 15)} 48L${s * hw} 40Z`;
        out += fill(fin(-1) + fin(1), accent);
      }
      out += fill(`M${-hw} -30H${hw}V40H${-hw}Z`, hull);
      for (let k = 1; k < v.stages; k++) {
        const y = -30 + (70 * k) / v.stages;
        out += fill(`M${-hw} ${n(y - 2.5)}h${2 * hw}v5h${-2 * hw}Z`, accent);
      }
      if (v.nose === 'cone') out += fill(`M${-hw} -30L0 -62L${hw} -30Z`, accent);
      else if (v.nose === 'ogive') out += fill(`M${-hw} -30Q${-hw} -56 0 -64Q${hw} -56 ${hw} -30Z`, hull) + fill(`M-6 -58Q0 -66 6 -58Z`, accent);
      else out += line('M0 -46V-64', 2.4) + fill(`M${-hw} -30L-5 -46H5L${hw} -30Z`, hull);
      return out + `<circle cx="0" cy="-16" r="4.2" fill="${glass}"/>`;
    }
    case 'capsule': {
      let out = '';
      if (v.service) {
        if (v.flame) out += flame(0, 47, 1);
        out += bell(0, 38, 1.1) + fill('M-22 0H22V38H-22Z', hull) + fill('M-22 12h44v6h-44Z', accent);
      } else if (v.flame) out += flame(0, 6, 0.8);
      return out + fill('M-28 0L-10 -40Q0 -45 10 -40L28 0Z', hull) + fill('M-28 0Q0 8 28 0Z', accent) + fill('M-9 -24H-3V-16H-9ZM3 -24H9V-16H3Z', glass);
    }
    case 'lander':
      return (
        line('M-26 18L-46 52M26 18L46 52M-14 26L-22 54M14 26L22 54', 2.4) +
        line('M-52 53H-40M40 53H52M-27 55H-17M17 55H27', 3) +
        fill('M-28 2H28L32 12V28H-32V12Z', FOIL) +
        fill('M-20 2L-22 -22L-8 -36H8L22 -22L20 2Z', hull) +
        fill('M-8 -24L0 -31L8 -24L4 -16H-4Z', glass) +
        line('M14 -36L20 -48', 1.8) +
        fill('M14 -48Q20 -42 26 -48Q20 -54 14 -48Z', METAL)
      );
    case 'rover': {
      // Side view, wheels on the ground at y = 34.
      const wheel = (x: number) => `<circle cx="${x}" cy="26" r="8.5" fill="${METAL}"/><circle cx="${x}" cy="26" r="3" fill="${glass}"/>`;
      return (
        line('M-28 14L-14 24L0 14L14 24L28 14', 2.2) +
        wheel(-28) + wheel(0) + wheel(28) +
        fill('M-34 -4H34V12H-34Z', hull) +
        fill('M-34 2h68v4h-68Z', accent) +
        fill('M-40 -2L-34 -2L-34 10L-44 6Z', FOIL) +
        line('M20 -4V-34', 2.4) +
        fill('M12 -44H32V-33H12Z', hull) +
        fill('M26 -41H30V-36H26Z', glass) +
        line('M-22 -4V-12', 2) +
        fill('M-32 -12Q-22 -24 -12 -12Z', hull)
      );
    }
    case 'satellite': {
      const panel = (x: number, y: number, w: number, h: number) => {
        let grid = '';
        for (let i = 1; i < 4; i++) grid += `M${n(x + (w * i) / 4)} ${n(y)}V${n(y + h)}`;
        return fill(`M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`, accent) + line(grid + `M${n(x)} ${n(y + h / 2)}H${n(x + w)}`, 1, glass);
      };
      return (
        line('M-20 0H20' + (v.panels === 'quad' ? 'M0 -22V22' : ''), 2.4) +
        panel(-66, -11, 46, 22) + panel(20, -11, 46, 22) +
        (v.panels === 'quad' ? panel(-11, -66, 22, 44) + panel(-11, 22, 22, 44) : '') +
        fill('M-13 -14H13V14H-13Z', FOIL) +
        fill('M-10 -26Q0 -12 10 -26Z', hull) +
        line('M0 -20V-34', 1.8)
      );
    }
    case 'probe': {
      // Voyager-style: a big dish facing us, the bus behind it, long instrument booms.
      const booms = 'M-6 30L-60 54M6 30L52 44' + (v.booms === 3 ? 'M8 24L50 -2' : '');
      return (
        line(booms, 2) +
        fill('M-62 52h6v6h-6Z', FOIL) +
        fill('M44 40l10 2-2 8-10-2Z', METAL) +
        (v.booms === 3 ? fill('M44 -8h12v10h-12Z', hull) : '') +
        fill('M-13 22H13L16 30L13 38H-13L-16 30Z', FOIL) +
        `<circle cx="0" cy="-10" r="34" fill="${hull}"/>` +
        `<circle cx="0" cy="-10" r="23" fill="none" stroke="${METAL}" stroke-width="1.6"/>` +
        line('M0 -10L-14 -34M0 -10L14 -34M0 -10L0 14', 1.4, METAL) +
        `<circle cx="0" cy="-10" r="5" fill="${accent}"/>`
      );
    }
  }
}

/** Local-coordinate bounds of the drawing (flames included), for centring and fitting it. */
export function vehicleBox(v: Vehicle): { top: number; bottom: number; width: number } {
  switch (v.kind) {
    case 'rocket':
      return { top: -64, bottom: v.flame ? 89 : 49, width: v.boosters || v.fins !== 'none' ? 64 : 32 };
    case 'capsule':
      return v.service ? { top: -45, bottom: v.flame ? 87 : 48, width: 58 } : { top: -45, bottom: v.flame ? 38 : 8, width: 58 };
    case 'lander':
      return { top: -54, bottom: 56, width: 106 };
    case 'satellite':
      return v.panels === 'quad' ? { top: -66, bottom: 66, width: 134 } : { top: -34, bottom: 14, width: 134 };
    case 'rover':
      return { top: -44, bottom: 35, width: 90 };
    case 'probe':
      return { top: -44, bottom: 58, width: 124 };
  }
}
