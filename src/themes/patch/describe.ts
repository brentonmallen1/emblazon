import { SURFACE_CRAFT, type BodyKind, type GardenSky, type Patch, type Vehicle, type WorldTone } from './types.ts';

const BODY_NAMES: Readonly<Record<BodyKind, string>> = {
  earth: 'Earth',
  moon: 'the Moon',
  mars: 'Mars',
  gasGiant: 'a gas giant',
  ringed: 'a ringed giant',
  ice: 'an ice world',
  dune: 'a desert world',
};

function vehicleName(v: Vehicle): string {
  switch (v.kind) {
    case 'rocket':
      return v.boosters ? 'a rocket with boosters' : `a ${v.stages > 1 ? `${v.stages}-stage ` : ''}rocket`;
    case 'capsule':
      return v.service ? 'a capsule' : 'a lone capsule';
    case 'lander':
      return 'a lander';
    case 'satellite':
      return 'a satellite';
    case 'rover':
      return 'a rover';
    case 'probe':
      return 'a probe';
    case 'starship':
      return 'a starship';
    case 'station':
      return 'a ring station';
    case 'garden':
      return `a ${v.plant} under a dome on ${WORLD_NAMES[v.world]}${GARDEN_SKY_NAMES[v.sky]}`;
    case 'orbits':
      return `${WORLD_NAMES[v.world]} inside ${v.rings} crossing orbits`;
  }
}

const GARDEN_SKY_NAMES: Readonly<Record<GardenSky, string>> = {
  moon: ' beneath a crescent moon',
  ringed: ' beneath a ringed planet',
  sun: ' beneath a small sun',
  none: '',
};

const WORLD_NAMES: Readonly<Record<WorldTone, string>> = {
  ash: 'a grey moon',
  rust: 'a red world',
  ocean: 'an ocean world',
  sand: 'a desert world',
  ochre: 'a dusty world',
  frost: 'an ice world',
};

const burning = (v: Vehicle): boolean => 'flame' in v && v.flame;

/** e.g. "Halcyon VII: a 2-stage rocket rising over Mars". */
export function describePatch(p: Patch): string {
  const what = vehicleName(p.vehicle);
  if (p.vehicle.kind === 'garden' || p.vehicle.kind === 'orbits') return `${p.name}: ${what}`;
  if (!p.body) return `${p.name}: ${what} among the stars`;
  const where = BODY_NAMES[p.body.kind];
  if (SURFACE_CRAFT.includes(p.vehicle.kind)) return `${p.name}: ${what} on ${where}`;
  if (p.body.placement !== 'horizon') return `${p.name}: ${what} bound for ${where}`;
  if (p.vehicle.kind === 'satellite' || p.trajectory?.kind === 'orbit') return `${p.name}: ${what} orbiting ${where}`;
  return `${p.name}: ${what} ${burning(p.vehicle) ? 'rising over' : 'above'} ${where}`;
}

/** What you notice at a glance: frame shape and colours, the body and where it sits, the craft. */
export function patchLookKey(p: Patch): string {
  const body = p.body ? `${p.body.kind}:${p.body.placement === 'horizon' ? 'horizon' : 'corner'}` : '-';
  const key = [p.shape, p.palette, body, p.vehicle.kind, p.trajectory?.kind ?? '-'];
  // v2 centrepieces: the part of each you notice (v1 keys are unchanged, so v1 pickers are too).
  const v = p.vehicle;
  if (v.kind === 'starship') key.push(v.wings);
  if (v.kind === 'station') key.push(v.panels);
  if (v.kind === 'garden') key.push(v.plant, v.world);
  if (v.kind === 'orbits') key.push(String(v.rings), v.world);
  return key.join(' | ');
}

/** The craft and its destination: what a picker should vary. */
export const patchMotif = (p: Patch): string => `${p.vehicle.kind}:${p.body?.kind ?? 'none'}`;
