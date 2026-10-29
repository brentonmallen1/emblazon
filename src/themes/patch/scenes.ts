import { circle } from '../../core/draw.ts';
import { n } from '../../core/svg.ts';
import type { PatchPalette } from './frame.ts';
import type { GardenSky, Plant, Vehicle, WorldTone } from './types.ts';

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

/** Linear blend of two #RRGGBB colours, `t` of the way from `a` to `b`. */
function mix(a: string, b: string, t: number): string {
  const ch = (i: number) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
  return `#${[1, 3, 5].map((i) => ch(i).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** What hangs over the garden's plain, in the upper right: nothing, a crescent, a ringed world or a sun. */
function gardenSky(sky: GardenSky, { thread, accent }: PatchPalette): string {
  const [cx, cy] = [166, 80];
  switch (sky) {
    case 'moon':
      return `<path d="M${cx} ${cy - 14}A14 14 0 1 0 ${cx} ${cy + 14}A10 14 0 1 1 ${cx} ${cy - 14}Z" fill="${thread}"/>`;
    case 'ringed':
      return (
        `<path d="${circle(cx, cy, 11)}" fill="${WORLDS.ash.surface}"/>` +
        `<ellipse cx="${cx}" cy="${cy}" rx="21" ry="5" fill="none" stroke="${accent}" stroke-width="1.8" transform="rotate(-15 ${cx} ${cy})"/>`
      );
    case 'sun': {
      const rays = Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const [dx, dy] = [Math.cos(a), Math.sin(a)];
        return `M${n(cx + dx * 12)} ${n(cy + dy * 12)}L${n(cx + dx * 16)} ${n(cy + dy * 16)}`;
      }).join('');
      return `<path d="${circle(cx, cy, 9)}" fill="${accent}"/><path d="${rays}" stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/>`;
    }
    case 'none':
      return '';
  }
}

/** A scene centrepiece in canvas coordinates, for a round frame centred on (120, 120). */
export function sceneArt(v: Vehicle, palette: PatchPalette): string {
  const { thread, accent } = palette;
  switch (v.kind) {
    case 'garden': {
      // A habitat dome standing on a planet's surface: a curved horizon fills the lower third,
      // the sky above may hold a moon, a ringed planet or a sun. The dome's back wall is an
      // opaque tint of the sky so the plant reads against it; a floor band and an airlock at
      // its side make it a building rather than a bubble.
      const world = WORLDS[v.world];
      const plant = PLANTS[v.plant];
      const leaf = leafFor(palette);
      const wall = mix(palette.inner, thread, 0.14);
      return (
        gardenSky(v.sky, palette) +
        // Ground: a lit rim along the horizon over the darker plain, with craters and rocks.
        `<path d="${circle(120, 404, 252)}" fill="${world.surface}"/>` +
        `<path d="${circle(120, 414, 252)}" fill="${world.band}"/>` +
        `<ellipse cx="72" cy="176" rx="12" ry="3.5" fill="none" stroke="${world.surface}" stroke-width="1.6"/>` +
        `<ellipse cx="176" cy="188" rx="9" ry="2.6" fill="none" stroke="${world.surface}" stroke-width="1.4"/>` +
        `<path d="M58 164l6 -6 7 6ZM166 168l5 -4 6 4Z" fill="${world.band}"/>` +
        // Dome: opaque back wall, pane lines, floor, the plant, then the glass front edge.
        `<path d="M78 152A42 42 0 0 1 162 152Z" fill="${wall}" stroke="${thread}" stroke-width="2"/>` +
        `<path d="M120 110V152M120 110Q144.4 131 146 152M120 110Q95.6 131 94 152" fill="none" stroke="${thread}" stroke-opacity="0.45" stroke-width="1.4"/>` +
        `<path d="M78 152A42 8.4 0 0 0 162 152" fill="${world.band}"/>` +
        `<g transform="translate(120 153) scale(0.64) translate(-120 -134)">` +
        `<path d="${plant.stem}${plant.fronds}" fill="none" stroke="${leaf}" stroke-width="3.5" stroke-linecap="round"/>` +
        (plant.leaves ? `<path d="${plant.leaves}" fill="${leaf}"/>` : '') +
        (plant.bud ? `<path d="${circle(120, 94, plant.bud)}" fill="${accent}"/>` : '') +
        `</g>` +
        `<path d="M78 152A42 8.4 0 0 0 162 152" fill="none" stroke="${thread}" stroke-width="2"/>` +
        `<path d="M91.9 139A25.9 25.9 0 0 1 109.2 118.5" fill="none" stroke="${thread}" stroke-opacity="0.6" stroke-width="2.2" stroke-linecap="round"/>` +
        // Airlock.
        `<path d="M160 140h16v12h-16Z" fill="${thread}"/><path d="M165 144h6v8h-6Z" fill="${wall}"/>`
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
