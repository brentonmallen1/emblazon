import { fnv1a } from '../../core/hash.ts';
import { DEFAULT_RIM, type RenderOptions } from '../../core/render-options.ts';
import { escapeXml, n } from '../../core/svg.ts';
import { bodyLayers } from './bodies.ts';
import { orbit, crewStars, skyAccents, swoosh } from './extras.ts';
import { BORDER_WIDTH, CANVAS, OUTLINE, PALETTES, borderLayer, shapePath } from './frame.ts';
import { skyLayer } from './sky.ts';
import { SURFACE_CRAFT, type Patch } from './types.ts';
import { vehicleArt, vehicleBox } from './vehicles.ts';

/** Longest side a vehicle is scaled to, in canvas units. */
const VEHICLE_LENGTH = 160;
/** Small craft (a lone capsule) would otherwise be blown up past their detail. */
const MAX_SCALE = 1.7;
/** Top of a horizon planet's limb, where a lander stands. */
const GROUND = 152;

/** Where the vehicle goes and how big it is drawn. */
export function vehiclePlacement(p: Patch): { x: number; y: number; scale: number } {
  const box = vehicleBox(p.vehicle);
  const fit = Math.min(VEHICLE_LENGTH / (box.bottom - box.top), VEHICLE_LENGTH / box.width, MAX_SCALE);
  const placement = p.body?.placement;
  const scale = fit * (placement === 'horizon' ? 0.86 : placement ? 0.92 : 1) * (p.vehicle.kind === 'satellite' || p.vehicle.kind === 'probe' ? 0.95 : 1);
  if (SURFACE_CRAFT.includes(p.vehicle.kind) && placement === 'horizon') {
    // Stand on the surface: the drawing's bottom sits on the planet's limb.
    return { x: 120, y: GROUND - ((box.bottom - box.top) / 2) * scale, scale };
  }
  const x = placement === 'left' ? 140 : placement === 'right' ? 100 : 120;
  const y = placement === 'horizon' ? 96 : placement ? 128 : 120;
  // Leave the crew stars' arc along the top clear.
  return p.accents.crew > 0 ? { x, y: y + 8, scale: scale * 0.88 } : { x, y, scale };
}

/** Pure: the same patch and options always produce the same SVG string. */
export function renderPatch(p: Patch, { size, finish = 'shaded', backdrop = 'light', rim = DEFAULT_RIM }: RenderOptions = {}): string {
  const id = `pt${fnv1a(JSON.stringify(p))}`;
  const palette = PALETTES[p.palette];
  const outer = shapePath(p.shape);
  const inner = shapePath(p.shape, BORDER_WIDTH);

  const sky = skyLayer(p.sky, palette, id);
  const body = p.body && bodyLayers(p.body.kind, p.body.placement, p.body.seed, id);
  const at = vehiclePlacement(p);
  const box = vehicleBox(p.vehicle);
  const vehicle =
    `<g transform="translate(${n(at.x)} ${n(at.y)}) rotate(${p.angle}) scale(${n(at.scale)}) translate(0 ${n(-(box.top + box.bottom) / 2)})">` +
    vehicleArt(p.vehicle, palette) +
    `</g>`;
  const path = p.trajectory?.kind === 'orbit' ? orbit(palette, at.x, at.y, p.trajectory.flip, id) : undefined;
  const freeSide = p.body?.placement === 'left' ? 'right' : p.body?.placement === 'right' ? 'left' : 'both';

  const art =
    sky.body +
    skyAccents(p.accents, palette, freeSide) +
    (body ? body.back + body.front : '') +
    (p.trajectory?.kind === 'swoosh' ? swoosh(palette, p.trajectory.flip) : '') +
    (path?.back ?? '') +
    vehicle +
    (path?.front ?? '') +
    crewStars(p.accents.crew, palette);

  const shaded = finish === 'shaded';
  const dims = size ? ` width="${size}" height="${size}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}"${dims}>` +
    `<defs><clipPath id="${id}-inner"><path d="${inner}"/></clipPath><clipPath id="${id}-outer"><path d="${outer}"/></clipPath>` +
    sky.defs +
    (body?.defs ?? '') +
    (path?.defs ?? '') +
    (shaded ? sheen(`${id}-sheen`) : '') +
    `</defs>` +
    borderLayer(p.shape, p.border, palette) +
    `<g clip-path="url(#${id}-inner)">${art}</g>` +
    `<path d="${inner}" fill="none" stroke="${OUTLINE}" stroke-width="2"/>` +
    (shaded ? `<g clip-path="url(#${id}-outer)"><rect width="${CANVAS}" height="${CANVAS}" fill="url(#${id}-sheen)"/></g>` : '') +
    (backdrop === 'dark' ? `<path d="${outer}" fill="none" stroke="${escapeXml(rim)}" stroke-width="9" stroke-linejoin="round"/>` : '') +
    `<path d="${outer}" fill="none" stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `</svg>`
  );
}

/** Thread sheen: a soft highlight upper left, a gentle darkening at the edges. */
const sheen = (id: string): string =>
  `<radialGradient id="${id}" cx="0.35" cy="0.28" r="0.85">` +
  `<stop offset="0" stop-color="#fff" stop-opacity="0.16"/>` +
  `<stop offset="0.5" stop-color="#fff" stop-opacity="0"/>` +
  `<stop offset="0.8" stop-color="#000" stop-opacity="0"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity="0.3"/>` +
  `</radialGradient>`;
