/** A mission patch. The stable contract between generate() and render(). Imagery only. */
export interface Patch {
  shape: PatchShape;
  border: BorderStyle;
  palette: PaletteId;
  sky: { seed: number; stars: number; nebula: boolean };
  body?: { kind: BodyKind; placement: BodyPlacement; seed: number };
  vehicle: Vehicle;
  /** Degrees clockwise from pointing straight up. */
  angle: number;
  trajectory?: { kind: 'swoosh' | 'orbit'; flip: boolean };
  /** Crew stars along the top, an optional small moon and constellation. */
  accents: { crew: number; moon: boolean; constellation: boolean; seed: number };
  /** Mission name, for the description only: never drawn. */
  name: string;
}

export const SHAPES = ['circle', 'oval', 'shield', 'hexagon'] as const;
export type PatchShape = (typeof SHAPES)[number];

export const BORDERS = ['single', 'double', 'stitched', 'beaded'] as const;
export type BorderStyle = (typeof BORDERS)[number];

export const PALETTE_IDS = [
  'nasa', 'gold', 'crimson', 'teal', 'violet', 'silver', 'ember', 'forest', 'ice', 'midnight', 'rose', 'copper',
] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const BODIES = ['earth', 'moon', 'mars', 'gasGiant', 'ringed', 'ice'] as const;
export type BodyKind = (typeof BODIES)[number];

export const BODY_PLACEMENTS = ['horizon', 'left', 'right'] as const;
export type BodyPlacement = (typeof BODY_PLACEMENTS)[number];

export type Vehicle =
  | { kind: 'rocket'; nose: 'cone' | 'ogive' | 'capsule'; fins: 'delta' | 'swept' | 'none'; boosters: boolean; stages: 1 | 2 | 3; flame: boolean }
  | { kind: 'capsule'; service: boolean; flame: boolean }
  | { kind: 'lander' }
  | { kind: 'satellite'; panels: 'wings' | 'quad' }
  | { kind: 'rover' }
  | { kind: 'probe'; booms: 2 | 3 };

export type VehicleKind = Vehicle['kind'];
export const VEHICLES: readonly VehicleKind[] = ['rocket', 'capsule', 'lander', 'rover', 'satellite', 'probe'];

/** Craft that stand on a surface rather than fly: they need a Moon or Mars horizon under them. */
export const SURFACE_CRAFT: readonly VehicleKind[] = ['lander', 'rover'];
