import { fnv1a } from '../../core/hash.ts';
import { DEFAULT_RIM, type RenderOptions } from '../../core/render-options.ts';
import { escapeXml, n } from '../../core/svg.ts';
import { bodyLayers } from './bodies.ts';
import { crewStars, orbit, skyAccents, swoosh } from './extras.ts';
import { CANVAS, PALETTES, bandFor, frameLayer, sceneTransform, shapePath } from './frame.ts';
import { sceneArt } from './scenes.ts';
import { skyLayer } from './sky.ts';
import { SCENES, SURFACE_CRAFT, type Patch } from './types.ts';
import { vehicleArt, vehicleBox } from './vehicles.ts';

/** Longest side a craft is scaled to, in canvas units. */
const VEHICLE_LENGTH = 128;
/** Small craft (a lone capsule) would otherwise be blown up past their detail. */
const MAX_SCALE = 1.4;
/** Top of a horizon planet's limb, where surface craft stand. */
const GROUND = 152;

/** Where the craft goes and how big it is drawn. */
export function vehiclePlacement(p: Patch): { x: number; y: number; scale: number } {
  const box = vehicleBox(p.vehicle);
  const fit = Math.min(VEHICLE_LENGTH / (box.bottom - box.top), VEHICLE_LENGTH / box.width, MAX_SCALE);
  const placement = p.body?.placement;
  const scale = fit * (placement === 'horizon' ? 0.82 : placement ? 0.88 : 1);
  if (SURFACE_CRAFT.includes(p.vehicle.kind) && placement === 'horizon') {
    // Stand on the surface: the drawing's bottom sits on the planet's limb.
    return { x: 120, y: GROUND - ((box.bottom - box.top) / 2) * scale, scale };
  }
  const x = placement === 'left' ? 136 : placement === 'right' ? 104 : 120;
  const y = placement === 'horizon' ? 102 : placement ? 128 : 120;
  return { x, y, scale };
}

/**
 * Pure: the same patch and options always produce the same SVG string. Patches have one look,
 * flat (after jb-rpg's deep-space symbol), so `style` and `finish` don't change them.
 */
export function renderPatch(p: Patch, { size, backdrop = 'light', rim = DEFAULT_RIM }: RenderOptions = {}): string {
  const id = `pt${fnv1a(JSON.stringify(p))}`;
  const palette = PALETTES[p.palette];
  const outer = shapePath(p.shape);
  const inner = shapePath(p.shape, bandFor(p.shape));
  const frame = frameLayer(p.shape, p.border, palette);

  const body = p.body && bodyLayers(p.body.kind, p.body.placement, p.body.seed, id, palette.thread);
  const at = vehiclePlacement(p);
  const box = vehicleBox(p.vehicle);
  const vehicle = SCENES.includes(p.vehicle.kind)
    ? sceneArt(p.vehicle, palette)
    : `<g transform="translate(${n(at.x)} ${n(at.y)}) rotate(${p.angle}) scale(${n(at.scale)}) translate(0 ${n(-(box.top + box.bottom) / 2)})">` +
    vehicleArt(p.vehicle, palette) +
    `</g>`;
  const path = p.trajectory?.kind === 'orbit' ? orbit(palette, at.x, at.y, p.trajectory.flip, id) : undefined;
  // A garden's sky body hangs in the upper right, so its accents go left.
  const gardenSky = p.vehicle.kind === 'garden' && p.vehicle.sky !== 'none';
  const freeSide = p.body?.placement === 'left' ? 'right' : p.body?.placement === 'right' || gardenSky ? 'left' : 'both';

  const scene =
    skyAccents(p.accents, palette, freeSide) +
    (body ? body.back + body.front : '') +
    (p.trajectory?.kind === 'swoosh' ? swoosh(palette, p.trajectory.flip) : '') +
    (path?.back ?? '') +
    vehicle +
    (path?.front ?? '');
  // Triangles draw the round-frame scene smaller, centred in the triangle; the sky stays full size.
  const fit = sceneTransform(p.shape);
  const art = skyLayer(p.sky, palette, p.shape) + (fit ? `<g transform="${fit}">${scene}</g>` : scene);

  const dims = size ? ` width="${size}" height="${size}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}"${dims}>` +
    `<defs><clipPath id="${id}-inner"><path d="${inner}"/></clipPath>` +
    (body?.defs ?? '') +
    (path?.defs ?? '') +
    `</defs>` +
    (backdrop === 'dark' ? `<path d="${outer}" fill="none" stroke="${escapeXml(rim)}" stroke-width="5" stroke-linejoin="round"/>` : '') +
    frame.under +
    `<g clip-path="url(#${id}-inner)">${art}</g>` +
    frame.over +
    crewStars(p.accents.crew, p.shape, palette) +
    `</svg>`
  );
}
