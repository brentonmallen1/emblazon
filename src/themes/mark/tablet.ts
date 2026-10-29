import { star } from '../../core/draw.ts';
import { mulberry32 } from '../../core/rng.ts';
import { n } from '../../core/svg.ts';
import type { ArtContext } from './art.ts';
import { INK, STONE_HEX } from './palette.ts';
import type { Tablet } from './types.ts';

/** The stone's face and the shadow strip down its right side. */
const SHAPES = {
  arched: { face: 'M80 200V76Q80 44 120 40Q160 44 160 76V200Z', side: 'M150 200V76Q150 56 138 46Q160 52 160 76V200Z' },
  pointed: { face: 'M80 200V80L120 38L160 80V200Z', side: 'M150 200V70L160 80V200Z' },
  stepped: { face: 'M80 200V76H88V62H100V48H140V62H152V76H160V200Z', side: 'M150 200V76H160V200Z' },
  broken: { face: 'M80 200V76Q80 44 120 40Q133 41 141 45L135 60L147 69L160 82V200Z', side: 'M150 200V72L160 82V200Z' },
} as const;

const BASE = 'M72 200H168V212H72Z';

/** Carved lines, drawn once in light (offset) and once in dark so they read as cut into the stone. */
const CARVINGS = {
  // A winged figure with a squid's head, seated on a ledge.
  figure:
    `<g transform="translate(120 128) scale(0.82) translate(-120 -120)">` +
    `<path d="M106 96C104 80 112 70 120 70C128 70 136 80 134 96"/>` +
    `<path d="M110 96Q108 108 112 116M117 97Q116 110 118 118M123 97Q124 110 122 118M130 96Q132 108 128 116"/>` +
    `<path d="M106 104C92 96 80 100 76 112C86 110 94 114 100 120M134 104C148 96 160 100 164 112C154 110 146 114 140 120"/>` +
    `<path d="M104 120Q120 112 136 120L140 150H100Z"/>` +
    `<path d="M100 150Q94 162 104 166H116M140 150Q146 162 136 166H124M90 170H150"/></g>`,
  // An eye with rays above it.
  eye: `<path d="M88 116Q120 88 152 116Q120 144 88 116Z"/><circle cx="120" cy="116" r="11"/>` +
    `<path d="M120 84V74M101 89L95 81M139 89L145 81M86 100L78 95M154 100L162 95M98 134Q120 146 142 134"/>`,
  // A five-pointed star with an eye at its heart.
  star: `<path d="${star(120, 118, 32, 5, 0.42)}"/><path d="M108 120Q120 110 132 120Q120 130 108 120Z"/>`,
  // A squid-headed thing, its tentacles trailing down the stone.
  kraken: `<path d="M106 108C102 84 112 68 120 64C128 68 138 84 134 108Z"/><path d="M110 92Q120 86 130 92"/>` +
    `<path d="M108 108C100 126 112 140 98 162M114 110C112 130 120 146 112 168M120 110V170M126 110C128 130 120 146 128 168M132 108C140 126 128 140 142 162"/>`,
} as const;

/** Glowing parts of each carving: eyes, or the iris. */
const GLOWS: Readonly<Record<Tablet['carving'], string>> = {
  figure: '<circle cx="112.8" cy="98" r="2.2"/><circle cx="127.2" cy="98" r="2.2"/>',
  eye: '<circle cx="120" cy="116" r="6"/>',
  star: '<circle cx="120" cy="120" r="3.4"/>',
  kraken: '<circle cx="113" cy="99" r="2.4"/><circle cx="127" cy="99" r="2.4"/>',
};

const CROWNS: Readonly<Record<Tablet['crown'], string>> = {
  star: `<path d="${star(120, 57, 7.5, 5, 0.42)}"/>`,
  eye: '<path d="M110 57Q120 49 130 57Q120 65 110 57Z"/><circle cx="120" cy="57" r="1.6"/>',
  moon: '<path d="M123 49.5A8 8 0 1 0 123 64.5A9.5 9.5 0 0 1 123 49.5Z"/>',
  none: '',
};

/** Runes: invented letter-like marks in a 6 × 8 box. */
const RUNES = [
  'M0 0V8M0 3L6 6', 'M3 0V8M0 3Q3 6 6 3', 'M0 8L3 2L6 8M3 0h.01', 'M0 4A3 3 0 1 1 6 4M3 4V8', 'M0 0L6 3L0 6M5 8h.01',
  'M0 0H6M3 0V5M0 8L3 5L6 8', 'M0 2L3 0L6 2M3 0V8M1 8H5', 'M6 0Q0 0 0 4T6 8M3 4h.01', 'M0 0V8M0 4H4L6 2M4 4L6 6', 'M1 0L5 8M5 0L3 4M0 8h.01',
  'M3 0V3M0 3H6L3 8Z',
];

const CRACKS = ['M148 46L141 62L149 76L143 94', 'M80 120L90 130L84 144L92 156', 'M160 138L151 148L157 162L150 170', 'M96 40L102 52L98 60'];

export function tabletArt(s: Tablet, ctx: ArtContext): string {
  const stone = STONE_HEX[s.stone];
  const shape = SHAPES[s.shape];
  const rng = mulberry32(ctx.seed);

  let runes = '';
  const rows = s.runes === 1 ? [180] : [176, 188];
  for (const y of rows) for (let i = 0; i < 6; i++) runes += place(RUNES[Math.floor(rng() * RUNES.length)], 89 + i * 11, y);
  const carving =
    `<g id="${ctx.id}-cv" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">` +
    CARVINGS[s.carving] + CROWNS[s.crown] + `<path d="${runes}" stroke-width="1.8"/></g>`;

  // One or two cracks, and the chipped corner at the foot.
  const first = Math.floor(rng() * CRACKS.length);
  let cracks = CRACKS[first];
  if (rng() < 0.4) cracks += CRACKS[(first + 1 + Math.floor(rng() * (CRACKS.length - 1))) % CRACKS.length];
  if (s.shape === 'broken') cracks += 'M141 45L135 60L147 69';
  cracks += 'M80 186L92 194L86 200';

  return (
    `<defs>${carving}<clipPath id="${ctx.id}-tf"><path d="${shape.face}"/></clipPath></defs>` +
    `<path d="${BASE}" fill="${stone.shade}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="${shape.face}" fill="${stone.face}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="${shape.side}" fill="${stone.shade}" clip-path="url(#${ctx.id}-tf)"/>` +
    `<use href="#${ctx.id}-cv" stroke="${stone.light}" transform="translate(0.9 1.2)"/>` +
    `<use href="#${ctx.id}-cv" stroke="#2A221A"/>` +
    `<g fill="${ctx.glow}"${ctx.glowAttr}>${GLOWS[s.carving]}</g>` +
    (s.carving === 'eye' ? `<path d="M120 111V121" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` : '') +
    `<path d="${cracks}" fill="none" stroke="#2A221A" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${ctx.id}-tf)"/>` +
    `<path d="${shape.face}" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
  );
}

/** A rune's path data moved so its box's top-left sits at (x, y). Lowercase commands are relative and stay as they are. */
function place(rune: string, x: number, y: number): string {
  return rune.replace(/([MLQTAHVZ])([^A-Za-z]*)/g, (_, cmd: string, args: string) => {
    const v = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    switch (cmd) {
      case 'Z':
        return 'Z';
      case 'H':
        return `H${n(x + v[0])}`;
      case 'V':
        return `V${n(y + v[0])}`;
      case 'A':
        return `A${v.slice(0, 5).join(' ')} ${n(x + v[5])} ${n(y + v[6])}`;
      default:
        return cmd + v.map((value, i) => n(i % 2 === 0 ? x + value : y + value)).join(' ');
    }
  });
}
