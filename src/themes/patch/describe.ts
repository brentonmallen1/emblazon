import { SURFACE_CRAFT, type BodyKind, type Patch, type Vehicle } from './types.ts';

const BODY_NAMES: Readonly<Record<BodyKind, string>> = {
  earth: 'Earth',
  moon: 'the Moon',
  mars: 'Mars',
  gasGiant: 'a gas giant',
  ringed: 'a ringed giant',
  ice: 'an ice world',
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
  }
}

const burning = (v: Vehicle): boolean => 'flame' in v && v.flame;

/** e.g. "Halcyon VII: a 2-stage rocket rising over Mars". */
export function describePatch(p: Patch): string {
  const what = vehicleName(p.vehicle);
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
  return [p.shape, p.palette, body, p.vehicle.kind, p.trajectory?.kind ?? '-'].join(' | ');
}

/** The craft and its destination: what a picker should vary. */
export const patchMotif = (p: Patch): string => `${p.vehicle.kind}:${p.body?.kind ?? 'none'}`;
