import { MAX_VARIANTS, THEMES, emblazonMany, type ThemeName } from '../index.ts';
import { LOOKS } from './looks.ts';

/** Longest input the JSON API accepts. Usernames, emails and UUIDs fit with room to spare. */
export const MAX_INPUT = 256;

export interface ApiResult {
  status: number;
  body: unknown;
  /** Cache-Control value. */
  cache: string;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: ApiResult };

const fail = (code: string, message: string, status = 400): { ok: false; error: ApiResult } => ({
  ok: false,
  error: { status, body: { error: { code, message } }, cache: 'no-store' },
});

/** Output is a pure function of the URL: a pinned version can be cached forever. */
export const cacheFor = (params: URLSearchParams): string =>
  params.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';

export interface RenderParams {
  theme: ThemeName;
  version: number;
  size?: number;
  backdrop?: 'dark';
  rim?: string;
}

/** Theme, version and render options from a query string, shared by every emblem route. */
export function readRender(themeName: string, params: URLSearchParams): Parsed<RenderParams> {
  if (!Object.hasOwn(THEMES, themeName)) return fail('unknown_theme', `unknown theme "${themeName}"; have ${Object.keys(THEMES).join(', ')}`);
  const theme = themeName as ThemeName;
  const { versions, latest } = THEMES[theme];
  const version = Number(params.get('v') ?? latest);
  if (!versions.includes(version)) return fail('unknown_version', `unknown ${theme} version; have ${versions.join(', ')}`);
  const sizeParam = params.get('size');
  const size = sizeParam ? Math.min(1024, Math.max(16, Math.round(Number(sizeParam)) || 0)) : undefined;
  const backdrop = params.get('backdrop') === 'dark' ? ('dark' as const) : undefined;
  const rim = params.get('rim') ?? undefined;
  return { ok: true, value: { theme, version, size, backdrop, rim } };
}

/** The image URL for one emblem, pinned to its version so it can be cached forever. */
export const imageUrl = (origin: string, theme: string, input: string, version: number): string =>
  `${origin}/${theme}/${encodeURIComponent(input)}.svg?v=${version}`;

/** GET /api/v1/themes */
export function themesResult(): ApiResult {
  const themes = Object.entries(THEMES).map(([name, t]) => ({
    name,
    label: LOOKS[name as ThemeName].label,
    latest: t.latest,
    versions: t.versions,
    accent: LOOKS[name as ThemeName].accent,
    background: LOOKS[name as ThemeName].bg,
  }));
  return { status: 200, body: { themes }, cache: 'public, max-age=3600' };
}

/** GET /api/v1/emblems?input=&theme=&count=&v=&size=&backdrop=&rim=&svg= */
export function emblemsResult(params: URLSearchParams, origin: string): ApiResult {
  const input = params.get('input');
  if (input === null || input.trim() === '') return fail('missing_input', 'input is required: any string, such as a username, email or UUID').error;
  if (input.length > MAX_INPUT) return fail('input_too_long', `input is limited to ${MAX_INPUT} characters`).error;

  const countParam = params.get('count') ?? '1';
  const count = Number(countParam);
  if (!Number.isInteger(count) || count < 1 || count > MAX_VARIANTS) return fail('bad_count', `count must be a whole number from 1 to ${MAX_VARIANTS}`).error;

  const render = readRender(params.get('theme') ?? 'heraldry', params);
  if (!render.ok) return render.error;
  const { theme, version, ...options } = render.value;
  const withSvg = params.get('svg') !== '0';

  const emblems = emblazonMany(input, { theme, version, count, ...options }).map((e) => ({
    input: e.input,
    theme: e.theme,
    version: e.version,
    description: e.description,
    credits: e.credits,
    url: imageUrl(origin, e.theme, e.input, e.version),
    config: e.config,
    ...(withSvg && { svg: e.svg }),
  }));
  return { status: 200, body: { theme, version, input, count: emblems.length, emblems }, cache: cacheFor(params) };
}

/** A compact OpenAPI 3.1 description of the service, for client generators and API tools. */
export function openApi(origin: string): unknown {
  const themes = Object.keys(THEMES);
  const q = (name: string, description: string, schema: unknown, required = false) => ({ name, in: 'query', required, description, schema });
  const renderParams = [
    q('v', "Theme version. Defaults to the theme's latest; pin it so emblems never change.", { type: 'integer' }),
    q('size', 'Width and height attributes on the SVG, 16 to 1024. Omit for a fluid SVG.', { type: 'integer', minimum: 16, maximum: 1024 }),
    q('backdrop', "'dark' adds a thin rim so the edge reads on near-black screens.", { type: 'string', enum: ['light', 'dark'] }),
    q('rim', 'Rim colour for a dark backdrop, e.g. #f0b060.', { type: 'string' }),
  ];
  const error = { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
  return {
    openapi: '3.1.0',
    info: { title: 'emblazon', version: '1', description: 'Deterministic emblems from any string. Same input, theme and version, same emblem, forever.' },
    servers: [{ url: origin }],
    paths: {
      '/api/v1/emblems': {
        get: {
          summary: `One to ${MAX_VARIANTS} emblems for an input, with descriptions and configs`,
          parameters: [
            q('input', `Any string, up to ${MAX_INPUT} characters.`, { type: 'string', maxLength: MAX_INPUT }, true),
            q('theme', 'Which kind of emblem.', { type: 'string', enum: themes, default: 'heraldry' }),
            q('count', 'How many emblems. The first is always the plain emblem for the input; the rest are fixed variants.', { type: 'integer', minimum: 1, maximum: MAX_VARIANTS, default: 1 }),
            q('svg', "'0' leaves the SVG markup out and returns image URLs only.", { type: 'string', enum: ['0', '1'], default: '1' }),
            ...renderParams,
          ],
          responses: { 200: { description: 'The emblems', content: { 'application/json': { schema: { $ref: '#/components/schemas/EmblemSet' } } } }, 400: error },
        },
      },
      '/api/v1/themes': {
        get: { summary: 'Themes with their versions and screen colours', responses: { 200: { description: 'The themes', content: { 'application/json': { schema: { type: 'object', properties: { themes: { type: 'array', items: { $ref: '#/components/schemas/Theme' } } } } } } } } },
      },
      '/{theme}/{input}.svg': {
        get: {
          summary: 'The emblem as an image, for an <img src>',
          parameters: [
            { name: 'theme', in: 'path', required: true, schema: { type: 'string', enum: themes } },
            { name: 'input', in: 'path', required: true, description: 'URL-encoded input.', schema: { type: 'string' } },
            ...renderParams,
          ],
          responses: { 200: { description: 'SVG image', content: { 'image/svg+xml': {} } }, 400: { description: 'Bad request' } },
        },
      },
    },
    components: {
      schemas: {
        Emblem: {
          type: 'object',
          required: ['input', 'theme', 'version', 'description', 'credits', 'url', 'config'],
          properties: {
            input: { type: 'string', description: 'The exact string that reproduces this emblem. Store it with theme and version.' },
            theme: { type: 'string', enum: themes },
            version: { type: 'integer' },
            description: { type: 'string', description: 'A blazon, or a mission name and scene. Never drawn.' },
            credits: { type: 'array', items: { type: 'string' }, description: 'License credits for third-party art in this emblem.' },
            url: { type: 'string', format: 'uri', description: 'Version-pinned image URL.' },
            config: { type: 'object', description: "The theme's generated configuration." },
            svg: { type: 'string', description: 'SVG markup, unless svg=0.' },
          },
        },
        EmblemSet: {
          type: 'object',
          properties: {
            theme: { type: 'string' },
            version: { type: 'integer' },
            input: { type: 'string' },
            count: { type: 'integer' },
            emblems: { type: 'array', items: { $ref: '#/components/schemas/Emblem' } },
          },
        },
        Theme: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            label: { type: 'string' },
            latest: { type: 'integer' },
            versions: { type: 'array', items: { type: 'integer' } },
            accent: { type: 'string' },
            background: { type: 'string' },
          },
        },
        Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
      },
    },
  };
}
