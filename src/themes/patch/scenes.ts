import { circle } from '../../core/draw.ts';
import { n } from '../../core/svg.ts';
import type { PatchPalette } from './frame.ts';
import type { Plant, Vehicle, WorldTone } from './types.ts';

/** Small worlds for the scene centrepieces: surface colour and a darker band. */
export const WORLDS: Readonly<Record<WorldTone, { surface: string; band: string }>> = {
  ash: { surface: '#B7B2A6', band: '#948F84' },
  rust: { surface: '#C8693E', band: '#A4532F' },
  ocean: { surface: '#3E6FB0', band: '#2F5890' },
  sand: { surface: '#D4A060', band: '#B5844A' },
  ochre: { surface: '#D9B07A', band: '#B98B57' },
  frost: { surface: '#BFD9E3', band: '#8FB7C6' },
};

/** Plants for the dome, drawn standing on (120, 134): stems, filled leaves, line leaves, a bud. */
const PLANTS: Readonly<Record<Plant, { stem: string; leaves: string; fronds: string; bud: number }>> = {
  sprout: {
    stem: 'M120 134C120 122 121 112 120 102',
    leaves: 'M120 114C110 106 100 106 96 112C104 118 114 118 120 114ZM120 106C130 96 142 96 146 102C138 110 126 110 120 106Z',
    fronds: '',
    bud: 0,
  },
  sapling: { stem: 'M120 134V106M120 120L110 112', leaves: circle(120, 94, 17), fronds: '', bud: 0 },
  flower: {
    stem: 'M120 134C118 122 122 112 120 100M120 120C112 116 106 118 104 122',
    leaves: [[120, 86], [127.6, 91.5], [124.7, 100.5], [115.3, 100.5], [112.4, 91.5]].map(([x, y]) => circle(x, y, 6)).join(''),
    fronds: '',
    bud: 4,
  },
  fern: {
    stem: 'M120 134C118 118 112 106 104 96',
    leaves: '',
    fronds: 'M118 126L129 120M116 118L127 110M113 110L122 102M117 122L107 118M114 114L104 108M110 105L102 100',
    bud: 0,
  },
};

/** Accents of the green palettes (lime, teal, mint), where bright leaves would vanish. */
const GREEN_ACCENTS = new Set(['#A9DC7E', '#4FC1A6', '#7FE0B0']);
const leafFor = (palette: PatchPalette): string => (GREEN_ACCENTS.has(palette.accent) ? '#5E9E6A' : '#7FE0B0');

/** A scene centrepiece in canvas coordinates, for a round frame centred on (120, 120). */
export function sceneArt(v: Vehicle, palette: PatchPalette): string {
  const { thread, accent } = palette;
  switch (v.kind) {
    case 'garden': {
      // A glass dome on the near face of a small ringed world, low in the frame: the dome's
      // round footprint shows as a floor ring, the planet shows through the glass.
      const world = WORLDS[v.world];
      const plant = PLANTS[v.plant];
      const leaf = leafFor(palette);
      const ring = (d: string) => `<path d="${d}" fill="none" stroke="${accent}" stroke-width="2.4" transform="rotate(-10 120 170)"/>`;
      return (
        ring('M50 170A70 14 0 1 1 190 170A70 14 0 1 1 50 170') +
        `<path d="${circle(120, 170, 40)}" fill="${world.surface}"/>` +
        `<path d="${circle(104, 192, 5)}${circle(140, 184, 3.5)}" fill="${world.band}"/>` +
        ring('M50 170A70 14 0 0 0 190 170') +
        `<path d="M86 148A34 8 0 1 1 154 148A34 8 0 1 1 86 148Z" fill="${thread}" fill-opacity="0.18"/>` +
        `<path d="M86 148A34 34 0 0 1 154 148Z" fill="${thread}" fill-opacity="0.1" stroke="${thread}" stroke-width="2"/>` +
        `<path d="M86 148A34 8 0 0 0 154 148" fill="none" stroke="${thread}" stroke-width="2"/>` +
        `<path d="M94 136A26 26 0 0 1 108 118" fill="none" stroke="${thread}" stroke-opacity="0.6" stroke-width="2.2" stroke-linecap="round"/>` +
        `<g transform="translate(120 148) scale(0.52) translate(-120 -134)">` +
        `<path d="${plant.stem}${plant.fronds}" fill="none" stroke="${leaf}" stroke-width="4" stroke-linecap="round"/>` +
        (plant.leaves ? `<path d="${plant.leaves}" fill="${leaf}"/>` : '') +
        (plant.bud ? `<path d="${circle(120, 94, plant.bud)}" fill="${accent}"/>` : '') +
        `</g>`
      );
    }
    case 'orbits': {
      // A small world inside two or three crossing orbits; each orbit's near half passes in front.
      const world = WORLDS[v.world];
      const rings: [tilt: number, rx: number, ry: number, color: string, extra: string][] = [
        [-22, 74, 18, thread, ''],
        [22, 74, 18, accent, ''],
        [0, 92, 11, thread, ' stroke-opacity="0.55" stroke-dasharray="4 5"'],
      ];
      const used = rings.slice(0, v.rings);
      const far = used.map(([t, rx, ry, c, x]) => `<path d="M${120 - rx} 120A${rx} ${ry} 0 1 1 ${120 + rx} 120" fill="none" stroke="${c}" stroke-width="2.4" transform="rotate(${t} 120 120)"${x}/>`);
      const near = used.map(([t, rx, ry, c, x]) => `<path d="M${120 - rx} 120A${rx} ${ry} 0 0 0 ${120 + rx} 120" fill="none" stroke="${c}" stroke-width="2.4" transform="rotate(${t} 120 120)"${x}/>`);
      // Moons ride the first two orbits, on their near halves.
      const moon = (i: number, at: number, r: number, color: string) => {
        const [t, rx, ry] = rings[i];
        const a = (t * Math.PI) / 180;
        const [ex, ey] = [rx * Math.cos(at), ry * Math.sin(at)];
        return `<path d="${circle(120 + ex * Math.cos(a) - ey * Math.sin(a), 120 + ex * Math.sin(a) + ey * Math.cos(a), r)}" fill="${color}"/>`;
      };
      return (
        far.join('') +
        `<path d="${circle(120, 120, 34)}" fill="${world.surface}"/>` +
        (v.bands ? `<path d="M${n(120 - 32.5)} 110H${n(120 + 32.5)}M${n(120 - 32.2)} 131H${n(120 + 32.2)}" stroke="${world.band}" stroke-width="5"/>` : '') +
        near.join('') +
        (v.moons >= 1 ? moon(1, 0.5, 6.5, accent) : '') +
        (v.moons >= 2 ? moon(0, 2.5, 5, thread) : '')
      );
    }
    default:
      return '';
  }
}
