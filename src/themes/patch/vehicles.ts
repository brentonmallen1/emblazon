import { n } from '../../core/svg.ts';
import { OUTLINE, type PatchPalette } from './frame.ts';
import type { Vehicle } from './types.ts';

/** Hull white, metal grey, foil gold, panel blue, flame. Fixed: vehicles read as hardware. */
const HULL = '#EEF0F3';
const METAL = '#9AA3AF';
const FOIL = '#D9A032';
const PANEL = '#2B4EA2';
const FLAME_OUT = '#FF7A1A';
const FLAME_IN = '#FFD23F';
const GLASS = '#1E2A4A';

const shape = (d: string, fill: string, width = 2.2) =>
  `<path d="${d}" fill="${fill}" stroke="${OUTLINE}" stroke-width="${width}" stroke-linejoin="round"/>`;

const flame = (x: number, y: number, s: number) =>
  shape(`M${n(x - 9 * s)} ${n(y)}Q${n(x - 12 * s)} ${n(y + 28 * s)} ${n(x)} ${n(y + 48 * s)}Q${n(x + 12 * s)} ${n(y + 28 * s)} ${n(x + 9 * s)} ${n(y)}Z`, FLAME_OUT, 1.6) +
  `<path d="M${n(x - 5 * s)} ${n(y)}Q${n(x - 6 * s)} ${n(y + 20 * s)} ${n(x)} ${n(y + 34 * s)}Q${n(x + 6 * s)} ${n(y + 20 * s)} ${n(x + 5 * s)} ${n(y)}Z" fill="${FLAME_IN}"/>`;

const bell = (x: number, y: number, s: number) => shape(`M${n(x - 7 * s)} ${n(y)}H${n(x + 7 * s)}L${n(x + 10 * s)} ${n(y + 10 * s)}H${n(x - 10 * s)}Z`, METAL, 1.8);

/**
 * A vehicle drawn pointing up in local coordinates, about 150 units from nose to flame tip,
 * roughly centred on the origin. The renderer places, scales and rotates it.
 */
export function vehicleArt(v: Vehicle, palette: PatchPalette): string {
  switch (v.kind) {
    case 'rocket':
      return rocket(v, palette);
    case 'capsule': {
      let s = '';
      if (v.service) {
        if (v.flame) s += flame(0, 48, 1);
        s += bell(0, 38, 1.1) + shape('M-22 0H22V38H-22Z', HULL) + `<rect x="-22" y="12" width="44" height="6" fill="${palette.accent}"/>`;
      } else if (v.flame) s += flame(0, 8, 0.8);
      return (
        s +
        shape('M-28 0L-10 -40Q0 -45 10 -40L28 0Z', HULL) +
        shape('M-28 0Q0 9 28 0', 'none', 3) +
        shape('M-9 -24H-3V-16H-9ZM3 -24H9V-16H3Z', GLASS, 1.4)
      );
    }
    case 'lander':
      return (
        shape('M-26 18L-48 54M26 18L48 54M-14 26L-24 56M14 26L24 56', 'none', 3.2) +
        `<path d="M-26 18L-48 54M26 18L48 54M-14 26L-24 56M14 26L24 56" stroke="${METAL}" stroke-width="1.6"/>` +
        shape('M-54 54H-42M42 54H54M-30 56H-18M18 56H30', 'none', 3.5) +
        shape('M-28 2H28L32 12V28H-32V12Z', FOIL) +
        shape('M-20 2L-22 -22L-8 -36H8L22 -22L20 2Z', HULL) +
        shape('M-8 -24L0 -31L8 -24L4 -16H-4Z', GLASS, 1.4) +
        shape('M14 -36L20 -50', 'none', 2) +
        shape('M14 -50Q20 -44 26 -50Q20 -56 14 -50Z', METAL, 1.4)
      );
    case 'satellite': {
      const panel = (x: number, y: number, w: number, h: number) => {
        let grid = '';
        for (let i = 1; i < 4; i++) grid += `M${n(x + (w * i) / 4)} ${n(y)}V${n(y + h)}`;
        grid += `M${n(x)} ${n(y + h / 2)}H${n(x + w)}`;
        return shape(`M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`, PANEL, 1.8) + `<path d="${grid}" stroke="${palette.thread}" stroke-opacity="0.55" stroke-width="1"/>`;
      };
      const wings = panel(-66, -11, 46, 22) + panel(20, -11, 46, 22);
      const quad = v.panels === 'quad' ? panel(-11, -66, 22, 44) + panel(-11, 22, 22, 44) : '';
      return (
        shape('M-20 0H20' + (v.panels === 'quad' ? 'M0 -22V22' : ''), 'none', 3) +
        wings +
        quad +
        shape('M-13 -14H13V14H-13Z', FOIL) +
        shape('M-10 -26Q0 -12 10 -26Z', HULL, 1.8) +
        shape('M0 -20V-34', 'none', 1.8)
      );
    }
    case 'rover': {
      // Side view, standing on the ground at y = 34: six-wheel rocker body, mast camera, dish, RTG.
      const wheel = (x: number) =>
        `<circle cx="${x}" cy="26" r="8.5" fill="${METAL}" stroke="${OUTLINE}" stroke-width="2.2"/><circle cx="${x}" cy="26" r="3" fill="${OUTLINE}"/>`;
      return (
        shape('M-26 14L-14 24L0 14M0 14L14 24L26 14', 'none', 3.4) +
        `<path d="M-26 14L-14 24L0 14M0 14L14 24L26 14" fill="none" stroke="${METAL}" stroke-width="1.6"/>` +
        wheel(-28) + wheel(0) + wheel(28) +
        shape('M-34 -4H34V12H-34Z', HULL) +
        `<rect x="-34" y="2" width="68" height="4" fill="${palette.accent}"/>` +
        shape('M-40 -2L-34 -2L-34 10L-44 6Z', FOIL, 1.8) +
        shape('M20 -4V-34', 'none', 2.6) +
        shape('M12 -44H32V-33H12Z', HULL, 2) +
        shape('M26 -41H30V-36H26Z', GLASS, 1) +
        shape('M-22 -4V-12', 'none', 2) +
        shape('M-32 -12Q-22 -24 -12 -12Z', HULL, 1.8)
      );
    }
    case 'probe': {
      // Voyager-style: a big high-gain dish facing us, the bus behind it, long instrument booms.
      const booms =
        shape('M-6 30L-60 54M6 30L52 44' + (v.booms === 3 ? 'M8 24L50 -2' : ''), 'none', 2.6) +
        `<path d="M-6 30L-60 54M6 30L52 44${v.booms === 3 ? 'M8 24L50 -2' : ''}" stroke="${METAL}" stroke-width="1.2"/>`;
      return (
        booms +
        shape('M-62 52h6v6h-6Z', FOIL, 1.4) +
        shape('M44 40l10 2-2 8-10-2Z', METAL, 1.4) +
        (v.booms === 3 ? shape('M44 -8h12v10h-12Z', HULL, 1.6) : '') +
        shape('M-13 22H13L16 30L13 38H-13L-16 30Z', FOIL) +
        `<circle cx="0" cy="-10" r="34" fill="${HULL}" stroke="${OUTLINE}" stroke-width="2.4"/>` +
        `<circle cx="0" cy="-10" r="23" fill="none" stroke="${METAL}" stroke-width="1.6"/>` +
        shape('M0 -10L-14 -34M0 -10L14 -34M0 -10L0 14', 'none', 1.4) +
        `<circle cx="0" cy="-10" r="5" fill="${palette.accent}" stroke="${OUTLINE}" stroke-width="1.6"/>`
      );
    }
  }
}

function rocket(v: Extract<Vehicle, { kind: 'rocket' }>, palette: PatchPalette): string {
  const hw = 14;
  const top = -30;
  const bottom = 40;
  let back = '';
  let front = '';

  if (v.boosters) {
    for (const side of [-1, 1]) {
      const x0 = side * (hw + 2);
      const x1 = side * (hw + 12);
      const xm = (x0 + x1) / 2;
      if (v.flame) back += flame(xm, 48, 0.55);
      back += bell(xm, 42, 0.5);
      back += shape(`M${x0} 42V2L${xm} -12L${x1} 2V42Z`, HULL);
    }
  }
  if (v.flame) back += flame(0, 50, 1);
  back += bell(0, bottom, 1);

  const fin = (side: number) =>
    v.fins === 'delta'
      ? `M${side * hw} 16L${side * (hw + 17)} 48L${side * hw} 40Z`
      : `M${side * hw} 8L${side * (hw + 15)} 32L${side * (hw + 15)} 50L${side * hw} 40Z`;
  if (v.fins !== 'none') back += shape(fin(-1) + fin(1), palette.accent);

  front += shape(`M${-hw} ${top}H${hw}V${bottom}H${-hw}Z`, HULL);
  for (let k = 1; k < v.stages; k++) {
    const y = top + ((bottom - top) * k) / v.stages;
    front += `<rect x="${-hw}" y="${n(y - 2.5)}" width="${2 * hw}" height="5" fill="${palette.accent}" stroke="${OUTLINE}" stroke-width="1.2"/>`;
  }
  switch (v.nose) {
    case 'cone':
      front += shape(`M${-hw} ${top}L0 -62L${hw} ${top}Z`, palette.accent);
      break;
    case 'ogive':
      front += shape(`M${-hw} ${top}Q${-hw} -56 0 -64Q${hw} -56 ${hw} ${top}Z`, HULL);
      break;
    case 'capsule':
      front += shape('M0 -46V-64', 'none', 2.4) + shape('M-3 -60L0 -68L3 -60Z', METAL, 1.2) + shape(`M${-hw} ${top}L-5 -46H5L${hw} ${top}Z`, HULL);
      break;
  }
  front += shape(`M${-hw} -14h${2 * hw}v5h${-2 * hw}Z`, palette.accent, 1.2);
  front += `<circle cx="0" cy="-22" r="3.6" fill="${GLASS}" stroke="${OUTLINE}" stroke-width="1.4"/>`;
  return back + front;
}

/** Local-coordinate bounds of the drawing (flames included), for centring and fitting it. */
export function vehicleBox(v: Vehicle): { top: number; bottom: number; width: number } {
  switch (v.kind) {
    case 'rocket':
      return { top: v.nose === 'capsule' ? -68 : -64, bottom: v.flame ? 98 : 50, width: v.boosters || v.fins !== 'none' ? 64 : 32 };
    case 'capsule':
      return v.service ? { top: -45, bottom: v.flame ? 96 : 49, width: 58 } : { top: -45, bottom: v.flame ? 46 : 5, width: 58 };
    case 'lander':
      return { top: -56, bottom: 57, width: 110 };
    case 'satellite':
      return v.panels === 'quad' ? { top: -66, bottom: 66, width: 134 } : { top: -34, bottom: 14, width: 134 };
    case 'rover':
      return { top: -44, bottom: 35, width: 90 };
    case 'probe':
      return { top: -44, bottom: 58, width: 124 };
  }
}
