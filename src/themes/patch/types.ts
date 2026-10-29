/** A mission patch. The stable contract between generate() and render(). Imagery only. */
export interface Patch {
  shape: PatchShape;
  border: BorderStyle;
  palette: PaletteId;
  sky: { seed: number; stars: number };
  body?: { kind: BodyKind; placement: BodyPlacement; seed: number };
  vehicle: Vehicle;
  /** Degrees clockwise from pointing straight up. */
  angle: number;
  trajectory?: { kind: 'swoosh' | 'orbit'; flip: boolean };
  /** Crew stars in the border band, an optional small moon and constellation. */
  accents: { crew: number; moon: boolean; constellation: boolean; seed: number };
  /** Mission name, for the description only: never drawn. */
  name: string;
}

export const SHAPES = ['circle', 'oval', 'shield', 'hexagon', 'octagon', 'square', 'triangle', 'triangleDown'] as const;
export type PatchShape = (typeof SHAPES)[number];

export const BORDERS = ['single', 'double', 'stitched', 'beaded'] as const;
export type BorderStyle = (typeof BORDERS)[number];

export const PALETTE_IDS = [
  'amber', 'cyan', 'scarlet', 'gold', 'lime', 'violet', 'rose', 'silver', 'teal', 'sun', 'azure', 'coral',
  'mint', 'tangerine', 'periwinkle', 'crimson',
] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const BODIES = ['earth', 'moon', 'mars', 'gasGiant', 'ringed', 'ice', 'dune'] as const;
export type BodyKind = (typeof BODIES)[number];

export const BODY_PLACEMENTS = ['horizon', 'left', 'right'] as const;
export type BodyPlacement = (typeof BODY_PLACEMENTS)[number];

export type Vehicle =
  | { kind: 'rocket'; nose: 'cone' | 'ogive' | 'capsule'; fins: 'delta' | 'swept' | 'none'; boosters: boolean; stages: 1 | 2 | 3; flame: boolean }
  | { kind: 'capsule'; service: boolean; flame: boolean }
  | { kind: 'lander' }
  | { kind: 'satellite'; panels: 'wings' | 'quad' }
  | { kind: 'rover' }
  | { kind: 'probe'; booms: 2 | 3 }
  // v2 centrepieces. A garden or an orbit scene brings its own small world, so it has no body.
  | { kind: 'starship'; wings: 'delta' | 'swept' | 'dart'; engines: 1 | 2 | 3 }
  | { kind: 'station'; panels: 'top' | 'both' | 'none'; spokes: 2 | 4 }
  | { kind: 'garden'; plant: Plant; world: WorldTone; sky: GardenSky }
  | { kind: 'orbits'; rings: 2 | 3; moons: 0 | 1 | 2; bands: boolean; world: WorldTone };

export type VehicleKind = Vehicle['kind'];
export const VEHICLES: readonly VehicleKind[] = ['rocket', 'capsule', 'lander', 'rover', 'satellite', 'probe', 'starship', 'station', 'garden', 'orbits'];

export const PLANTS = ['sprout', 'sapling', 'flower', 'fern'] as const;
export type Plant = (typeof PLANTS)[number];

export const WORLD_TONES = ['ash', 'rust', 'ocean', 'sand', 'ochre', 'frost'] as const;
export type WorldTone = (typeof WORLD_TONES)[number];

/** What hangs in the sky over a garden dome's plain. */
export const GARDEN_SKIES = ['moon', 'ringed', 'sun', 'none'] as const;
export type GardenSky = (typeof GARDEN_SKIES)[number];

/** Centrepieces that draw their own world, in canvas coordinates, instead of a placed craft. */
export const SCENES: readonly VehicleKind[] = ['garden', 'orbits'];

/** Craft that stand on a surface rather than fly: they need a Moon, Mars or desert horizon under them. */
export const SURFACE_CRAFT: readonly VehicleKind[] = ['lander', 'rover'];
