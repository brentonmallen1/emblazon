import { normalizeInput } from '../../core/hash.ts';
import { chance, int, pick, rngFor, weighted, type Rng } from '../../core/rng.ts';
import { isTriangle } from './frame.ts';
import { PLANTS, SCENES, SURFACE_CRAFT, WORLD_TONES, type BodyKind, type BodyPlacement, type BorderStyle, type PaletteId, type Patch, type PatchShape, type Vehicle, type VehicleKind } from './types.ts';

export const PATCH_VERSION = 2;
export const PATCH_VERSIONS: readonly number[] = [1, 2];

/** Pick weights for patch v1 (the shapes and craft of its day). Frozen once released, like heraldry's. Key order matters. */
const W1 = {
  shapes: { circle: 3, oval: 2, shield: 2, hexagon: 2, octagon: 2, square: 1 } satisfies Partial<Record<PatchShape, number>>,
  borders: { single: 2, double: 2, stitched: 3, beaded: 1 } satisfies Record<BorderStyle, number>,
  palettes: { amber: 1, cyan: 1, scarlet: 1, gold: 1, lime: 1, violet: 1, rose: 1, silver: 1, teal: 1, sun: 1, azure: 1, coral: 1, mint: 1, tangerine: 1, periwinkle: 1, crimson: 1 } satisfies Record<PaletteId, number>,
  bodyChance: 0.8,
  bodies: { earth: 3, moon: 3, mars: 2, gasGiant: 2, ringed: 2, ice: 1, dune: 2 } satisfies Record<BodyKind, number>,
  placements: { horizon: 3, left: 1, right: 1 } satisfies Record<BodyPlacement, number>,
  vehicles: { rocket: 3, capsule: 2, lander: 1.5, rover: 1.5, satellite: 2, probe: 2 } satisfies Partial<Record<VehicleKind, number>>,
  trajectories: { none: 2, swoosh: 2, orbit: 2 },
  crew: { 0: 3, 1: 1, 2: 1, 3: 2, 4: 2, 5: 1, 6: 1, 7: 1 },
};

/**
 * v2: triangle frames, and new centrepieces in place of the old rocket: a starship, a ring
 * station, a garden under a dome and a world inside crossing orbits.
 */
const W2 = {
  ...W1,
  shapes: { ...W1.shapes, triangle: 1.5, triangleDown: 1 } satisfies Record<PatchShape, number>,
  vehicles: { rocket: 0, capsule: 1.5, lander: 1.5, rover: 1.5, satellite: 2, probe: 1.5, starship: 3, station: 2, garden: 2, orbits: 2 } satisfies Record<VehicleKind, number>,
};

const WEIGHTS: Readonly<Record<number, typeof W2>> = { 1: W1 as typeof W2, 2: W2 };

const NAMES = [
  'Artemis', 'Halcyon', 'Perseus', 'Vesper', 'Orion', 'Lyra', 'Corvus', 'Aurora', 'Kestrel', 'Meridian',
  'Solace', 'Tethys', 'Hyperion', 'Calypso', 'Draco', 'Polaris', 'Zephyr', 'Icarus', 'Pioneer', 'Sentinel',
  'Odyssey', 'Horizon', 'Nomad', 'Ember', 'Atlas', 'Juno', 'Selene', 'Talon', 'Vanguard', 'Wayfarer',
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const seed = (rng: Rng): number => int(rng, 0, 0x7fffffff);

/** Pure and deterministic, one seeded stream per slot (see heraldry's generateArms). */
export function generatePatch(input: string, version: number = PATCH_VERSION): Patch {
  if (!PATCH_VERSIONS.includes(version)) throw new RangeError(`patch v${version} does not exist (have: ${PATCH_VERSIONS.join(', ')})`);
  const w = WEIGHTS[version];
  const key = normalizeInput(input);
  const slot = (name: string) => rngFor(`v${version}`, 'patch', name, key);

  const shape = weighted(slot('shape'), w.shapes);
  const border = weighted(slot('border'), w.borders);
  const palette = weighted(slot('palette'), w.palettes);

  const skyRng = slot('sky');
  const sky = { seed: seed(skyRng), stars: int(skyRng, 12, 26) };

  const bodyRng = slot('body');
  let body = chance(bodyRng, w.bodyChance)
    ? { kind: weighted(bodyRng, w.bodies), placement: weighted(bodyRng, w.placements), seed: seed(bodyRng) }
    : undefined;

  // Landers and rovers stand on a surface: only on a Moon or Mars horizon, upright, no trajectory.
  const vRng = slot('vehicle');
  const canLand = body?.placement === 'horizon' && (body.kind === 'moon' || body.kind === 'mars' || body.kind === 'dune');
  const kind = weighted(vRng, canLand ? w.vehicles : { ...w.vehicles, lander: 0, rover: 0 });
  const vehicle = makeVehicle(vRng, kind);
  const grounded = SURFACE_CRAFT.includes(kind);
  // Scenes bring their own world and stand upright, with nothing flying past.
  const scene = SCENES.includes(kind);
  if (scene) body = undefined;
  const angle = grounded || scene ? 0 : Math.round((vRng() * 2 - 1) * (kind === 'satellite' || kind === 'probe' ? 40 : kind === 'station' ? 12 : 28));

  const tRng = slot('trajectory');
  // A starship leaves its own trails and a station is already a ring: neither also orbits.
  const tKind = grounded || scene ? 'none' : weighted(tRng, kind === 'starship' || kind === 'station' ? { ...w.trajectories, orbit: 0 } : w.trajectories);
  const trajectory = tKind === 'none' ? undefined : { kind: tKind, flip: chance(tRng, 0.5) };

  const aRng = slot('accents');
  const crew = Number(weighted(aRng, Object.fromEntries(Object.entries(w.crew)) as Record<string, number>));
  const accents = {
    // A triangle's band is too narrow for crew stars.
    crew: isTriangle(shape) ? 0 : crew,
    moon: body?.kind !== 'moon' && chance(aRng, 0.3),
    constellation: chance(aRng, 0.3),
    seed: seed(aRng),
  };

  const nRng = slot('name');
  const word = pick(nRng, NAMES);
  const num = int(nRng, 1, 12);
  const name = pick(nRng, [`${word}-${num}`, `${word} ${ROMAN[num - 1]}`, `${word} ${num}`]);

  return { shape, border, palette, sky, ...(body && { body }), vehicle, angle, ...(trajectory && { trajectory }), accents, name };
}

function makeVehicle(rng: Rng, kind: VehicleKind): Vehicle {
  switch (kind) {
    case 'rocket':
      return {
        kind,
        nose: weighted(rng, { cone: 2, ogive: 2, capsule: 1 }),
        fins: weighted(rng, { delta: 2, swept: 2, none: 1 }),
        boosters: chance(rng, 0.35),
        stages: Number(weighted(rng, { 1: 1, 2: 2, 3: 1 })) as 1 | 2 | 3,
        flame: chance(rng, 0.75),
      };
    case 'capsule':
      return { kind, service: chance(rng, 0.7), flame: chance(rng, 0.5) };
    case 'lander':
      return { kind };
    case 'satellite':
      return { kind, panels: weighted(rng, { wings: 3, quad: 1 }) };
    case 'rover':
      return { kind };
    case 'probe':
      return { kind, booms: chance(rng, 0.5) ? 3 : 2 };
    case 'starship':
      return { kind, wings: weighted(rng, { delta: 2, swept: 2, dart: 1 }), engines: Number(weighted(rng, { 1: 1, 2: 2, 3: 1 })) as 1 | 2 | 3 };
    case 'station':
      return { kind, panels: weighted(rng, { top: 2, both: 1, none: 1 }), spokes: chance(rng, 0.5) ? 4 : 2 };
    case 'garden':
      return { kind, plant: pick(rng, PLANTS), world: pick(rng, WORLD_TONES) };
    case 'orbits':
      return { kind, rings: chance(rng, 0.6) ? 2 : 3, moons: Number(weighted(rng, { 0: 1, 1: 2, 2: 1 })) as 0 | 1 | 2, bands: chance(rng, 0.6), world: pick(rng, WORLD_TONES) };
  }
}
