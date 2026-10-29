import { normalizeInput } from '../../core/hash.ts';
import { chance, int, pick, rngFor, weighted, type Rng } from '../../core/rng.ts';
import { SURFACE_CRAFT, type BodyKind, type BodyPlacement, type BorderStyle, type PaletteId, type Patch, type PatchShape, type Vehicle, type VehicleKind } from './types.ts';

export const PATCH_VERSION = 1;
export const PATCH_VERSIONS: readonly number[] = [1];

/** Pick weights for patch v1. Frozen once released, like heraldry's. Key order matters. */
const W1 = {
  shapes: { circle: 3, oval: 2, shield: 2, hexagon: 2 } satisfies Record<PatchShape, number>,
  borders: { single: 2, double: 2, stitched: 3, beaded: 1 } satisfies Record<BorderStyle, number>,
  palettes: { nasa: 1, gold: 1, crimson: 1, teal: 1, violet: 1, silver: 1, ember: 1, forest: 1, ice: 1, midnight: 1, rose: 1, copper: 1 } satisfies Record<PaletteId, number>,
  bodyChance: 0.8,
  bodies: { earth: 3, moon: 3, mars: 2, gasGiant: 2, ringed: 2, ice: 1 } satisfies Record<BodyKind, number>,
  placements: { horizon: 3, left: 1, right: 1 } satisfies Record<BodyPlacement, number>,
  vehicles: { rocket: 3, capsule: 2, lander: 1.5, rover: 1.5, satellite: 2, probe: 2 } satisfies Record<VehicleKind, number>,
  trajectories: { none: 2, swoosh: 2, orbit: 2 },
  crew: { 0: 3, 1: 1, 2: 1, 3: 2, 4: 2, 5: 1, 6: 1, 7: 1 },
};

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
  const w = W1;
  const key = normalizeInput(input);
  const slot = (name: string) => rngFor(`v${version}`, 'patch', name, key);

  const shape = weighted(slot('shape'), w.shapes);
  const border = weighted(slot('border'), w.borders);
  const palette = weighted(slot('palette'), w.palettes);

  const skyRng = slot('sky');
  const sky = { seed: seed(skyRng), stars: int(skyRng, 26, 60), nebula: chance(skyRng, 0.45) };

  const bodyRng = slot('body');
  const body = chance(bodyRng, w.bodyChance)
    ? { kind: weighted(bodyRng, w.bodies), placement: weighted(bodyRng, w.placements), seed: seed(bodyRng) }
    : undefined;

  // Landers and rovers stand on a surface: only on a Moon or Mars horizon, upright, no trajectory.
  const vRng = slot('vehicle');
  const canLand = body?.placement === 'horizon' && (body.kind === 'moon' || body.kind === 'mars');
  const kind = weighted(vRng, canLand ? w.vehicles : { ...w.vehicles, lander: 0, rover: 0 });
  const vehicle = makeVehicle(vRng, kind);
  const grounded = SURFACE_CRAFT.includes(kind);
  const angle = grounded ? 0 : Math.round((vRng() * 2 - 1) * (kind === 'satellite' || kind === 'probe' ? 40 : 28));

  const tRng = slot('trajectory');
  const tKind = grounded ? 'none' : weighted(tRng, w.trajectories);
  const trajectory = tKind === 'none' ? undefined : { kind: tKind, flip: chance(tRng, 0.5) };

  const aRng = slot('accents');
  const accents = {
    crew: Number(weighted(aRng, Object.fromEntries(Object.entries(w.crew)) as Record<string, number>)),
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
  }
}
