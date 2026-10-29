import { escapeXml } from '../core/svg.ts';
import {
  BODIES,
  BORDERS,
  PALETTE_IDS,
  PATCH_VERSION,
  SHAPES,
  describePatch,
  generatePatch,
  renderPatch,
  type Patch,
  type Vehicle,
} from '../themes/patch/index.ts';
import { cell, matrix, page, row, section, tile } from './layout.ts';

/** A plain composition every section varies one thing of. */
const BASE: Patch = {
  shape: 'circle',
  border: 'stitched',
  palette: 'nasa',
  sky: { seed: 7, stars: 40, nebula: false },
  body: { kind: 'earth', placement: 'horizon', seed: 3 },
  vehicle: { kind: 'rocket', nose: 'ogive', fins: 'delta', boosters: false, stages: 2, flame: true },
  angle: 18,
  accents: { crew: 3, moon: false, constellation: false, seed: 1 },
  name: 'Sheet',
};
const with_ = (over: Partial<Patch>): Patch => ({ ...BASE, ...over });
const show = (p: Patch, caption: string, size?: number) => tile(renderPatch(p, size ? { size } : {}), caption);

/** Contact sheet for the mission patch theme. */
export function patchSheet(): string {
  return page(
    'emblazon · mission patches',
    'Contact sheet: frames, palettes, planets, craft, trajectories and accents, then generated patches.',
    [
      section('Shapes × borders', matrix(BORDERS, SHAPES.map((shape) => `<div class="rowlabel">${shape}</div>` + BORDERS.map((border) => cell(renderPatch(with_({ shape, border }), { size: 96 }))).join('')))),
      section('Palettes', row(PALETTE_IDS.map((palette, i) => show(with_({ palette, sky: { ...BASE.sky, nebula: i % 2 === 0 } }), palette)))),
      section(
        'Planets',
        row(
          BODIES.flatMap((kind, i) => [
            show(with_({ body: { kind, placement: 'horizon', seed: 10 + i }, vehicle: { kind: 'satellite', panels: 'wings' }, angle: -12 }), `${kind} · horizon`),
            show(with_({ body: { kind, placement: i % 2 ? 'left' : 'right', seed: 20 + i } }), `${kind} · corner`),
          ]),
        ),
      ),
      section('Craft', row(VEHICLES_SHOWN.map(([vehicle, caption]) => show(with_({ vehicle, angle: vehicle.kind === 'lander' || vehicle.kind === 'rover' ? 0 : 14, body: vehicle.kind === 'lander' || vehicle.kind === 'rover' ? { kind: 'moon', placement: 'horizon', seed: 5 } : BASE.body }), caption)))),
      section(
        'Trajectories and accents',
        row([
          show(with_({ trajectory: { kind: 'swoosh', flip: false } }), 'swoosh'),
          show(with_({ trajectory: { kind: 'swoosh', flip: true }, angle: -18 }), 'swoosh, flipped'),
          show(with_({ trajectory: { kind: 'orbit', flip: false }, vehicle: { kind: 'satellite', panels: 'quad' }, body: undefined }), 'orbit'),
          show(with_({ accents: { crew: 7, moon: true, constellation: true, seed: 4 } }), '7 crew, moon, constellation'),
          show(with_({ accents: { crew: 0, moon: false, constellation: false, seed: 1 }, sky: { seed: 9, stars: 60, nebula: true } }), 'no crew, nebula'),
        ]),
      ),
      section('At avatar sizes', `<div class="sizes">${[32, 48, 64, 96, 128].map((s) => show(generatePatch('sizes-demo'), `${s}px`, s)).join('')}</div>`),
      section('Generated', generatedGrid(120)),
    ].join(''),
  );
}

const VEHICLES_SHOWN: readonly [Vehicle, string][] = [
  [{ kind: 'rocket', nose: 'cone', fins: 'delta', boosters: false, stages: 1, flame: true }, 'rocket · cone, delta'],
  [{ kind: 'rocket', nose: 'ogive', fins: 'swept', boosters: true, stages: 2, flame: true }, 'rocket · boosters'],
  [{ kind: 'rocket', nose: 'capsule', fins: 'none', boosters: false, stages: 3, flame: false }, 'rocket · capsule, 3 stages'],
  [{ kind: 'capsule', service: true, flame: true }, 'capsule + service module'],
  [{ kind: 'capsule', service: false, flame: false }, 'lone capsule'],
  [{ kind: 'lander' }, 'lander'],
  [{ kind: 'satellite', panels: 'wings' }, 'satellite · wings'],
  [{ kind: 'satellite', panels: 'quad' }, 'satellite · quad'],
  [{ kind: 'rover' }, 'rover'],
  [{ kind: 'probe', booms: 2 }, 'probe · 2 booms'],
  [{ kind: 'probe', booms: 3 }, 'probe · 3 booms'],
];

function generatedGrid(count: number): string {
  const tiles = Array.from({ length: count }, (_, i) => {
    const input = `crew${i}`;
    const p = generatePatch(input);
    return `<figure title="${escapeXml(`${input}: ${describePatch(p)}`)}">${renderPatch(p, { size: 64 })}<figcaption>${input}</figcaption></figure>`;
  });
  return `<p class="note">patch v${PATCH_VERSION} at 64px. Hover for the mission and scene.</p><div class="grid">${tiles.join('')}</div>`;
}
