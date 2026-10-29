# emblazon

Deterministic coats of arms from any string — like Robohash, but heraldry. The same input
always gives the same emblem, along with its blazon:

> **brenton** → *Vert, a fleur-de-lis Argent, a bordure Or.* (v1)

Installable and app-agnostic; its themes follow jb-rpg's six (see [docs/PLAN.md §0](docs/PLAN.md)).
No runtime dependencies. Requires Node 23.6+ (runs TypeScript directly).

## Use

```ts
import { emblazon } from 'emblazon';

const { svg, description, config } = emblazon('alice@example.com', { size: 64 });
```

`version` defaults to the latest (`2`). Pin it if your emblems must never change: every
released version is frozen and tested byte-for-byte. `config` can be stored and re-rendered with
`heraldry.renderArms(config)`.

### A picker (e.g. a hero's symbol)

```ts
import { emblazonOptions, emblazon, ATTRIBUTION } from 'emblazon';

// Six visibly different symbols, stable for this seed. Re-roll with `${seed}:${n}`.
const options = emblazonOptions(`${sessionId}:${heroName}`, { count: 6, backdrop: 'dark', rim: '#d9a557' });

// Store the choice as { input, version }; regenerate any time:
const { svg } = emblazon(chosen.input, { version: chosen.version, backdrop: 'dark' });
```

- Runs in the browser and Node alike: no dependencies, no `node:` imports, synchronous.
- `backdrop: 'dark'` adds a light rim so the shield edge reads on near-black screens; `rim` takes a
  theme accent colour.
- Show `ATTRIBUTION` somewhere (about or rules screen); each emblem also lists its own `credits`.
- TypeScript apps with bundler resolution (Vite) can import `src/` directly (`exports` points
  there); `npm run build` writes plain ES modules to `dist/` for everything else.
- Try it at `/picker` on the preview server: the same page imports the library in the browser.

## Credits

Some charges are adapted from [game-icons.net](https://game-icons.net) (CC BY 3.0). Anything that
shows emblems must credit them; the exact line is in [assets/CREDITS.md](assets/CREDITS.md), and
each adapted charge carries it as `CHARGES[id].credit`.

## Run

| Command | What it does |
|---|---|
| `npm run dev` | preview server on :4747 — playground at `/`, contact sheet at `/sheet/heraldry`, emblems at `/heraldry/{input}.svg?size=&v=` and `.json` |
| `npm test` | frozen-version snapshots and corpus digest, rule checks over 10k inputs per version, asset contract |
| `npm run stats [-- count version]` | how often two inputs look alike |
| `npm run import-icons` | rebuild game-icons charges from the vendored originals in `assets/vendor/game-icons/` |
| `npm run draw` | regenerate the geometric charge SVGs |
| `npm run assets` | validate and compile charge SVGs into `charges.generated.ts` |
| `npm run sheet` | write the contact sheet to `out/` |
| `npm run build` | plain ES modules in `dist/` (types stripped, `.ts` imports rewritten) |
| `npx -p typescript tsc -p tsconfig.browser.json` | type-check the library as a strict browser app would |

Design, asset inventory and roadmap: [docs/PLAN.md](docs/PLAN.md).
