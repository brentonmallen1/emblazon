# emblazon

Deterministic coats of arms from any string — like Robohash, but heraldry. The same input
always gives the same emblem, along with its blazon:

> **brenton** → *Vert, a fleur-de-lis Argent, a bordure Or.*

No runtime dependencies. Requires Node 23.6+ (runs TypeScript directly).

## Use

```ts
import { emblazon } from './src/index.ts';

const { svg, description, config } = emblazon('alice@example.com', { size: 64 });
```

Pin `version` if your emblems must never change; `config` can be stored and re-rendered
with `heraldry.renderArms(config)`.

## Run

| Command | What it does |
|---|---|
| `npm run dev` | preview server on :4747 — playground at `/`, contact sheet at `/sheet/heraldry`, emblems at `/heraldry/{input}.svg?size=&v=` and `.json` |
| `npm test` | determinism, frozen v1 snapshots, rule checks over 10k inputs, asset contract |
| `npm run stats` | how often two inputs look alike |
| `npm run draw` | regenerate the geometric charge SVGs |
| `npm run assets` | validate and compile charge SVGs into `charges.generated.ts` |
| `npm run sheet` | write the contact sheet to `out/` |

Design, asset inventory and roadmap: [docs/PLAN.md](docs/PLAN.md).
