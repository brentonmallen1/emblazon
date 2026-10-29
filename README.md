# emblazon

Deterministic coats of arms from any string — like Robohash, but heraldry. The same input
always gives the same emblem, along with its blazon:

> **brenton** → *Vert, a fleur-de-lis Argent, a bordure Or.* (v1)

Built first for hero symbols in jb-rpg; see [docs/PLAN.md §0](docs/PLAN.md).
No runtime dependencies. Requires Node 23.6+ (runs TypeScript directly).

## Use

```ts
import { emblazon } from './src/index.ts';

const { svg, description, config } = emblazon('alice@example.com', { size: 64 });
```

`version` defaults to the latest (`2`). Pin it if your emblems must never change: every
released version is frozen and tested byte-for-byte. `config` can be stored and re-rendered with
`heraldry.renderArms(config)`.

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

Design, asset inventory and roadmap: [docs/PLAN.md](docs/PLAN.md).
