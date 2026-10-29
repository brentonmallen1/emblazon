# emblazon

Deterministic emblems from any string — like Robohash, but coats of arms and mission patches.
The same input always gives the same emblem, along with a description:

> **brenton** → *Vert, a fleur-de-lis Argent, a bordure Or.* (heraldry v1)
>
> Themes: `heraldry` (coats of arms, v3) and `patch` (mission patches, v1).

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
const options = emblazonOptions(`${sessionId}:${heroName}`, { theme: 'heraldry', count: 6 });

// Store the choice as { theme, input, version }; regenerate any time:
const { svg } = emblazon(chosen.input, { theme: chosen.theme, version: chosen.version });
```

- Runs in the browser and Node alike: no dependencies, no `node:` imports, synchronous.
- Emblems are drawn flat by default (muted colours, thin accent line work, made for dark
  screens). Pinned older versions keep their original look; `style: 'classic'` asks for the
  bright, shaded heraldry explicitly.
- `backdrop: 'dark'` adds a light rim so the edge reads on near-black screens; `rim` takes a
  theme accent colour.
- Show `ATTRIBUTION` somewhere (about or rules screen); each emblem also lists its own `credits`.
- TypeScript apps with bundler resolution (Vite) can import `src/` directly (`exports` points
  there); `npm run build` writes plain ES modules to `dist/` for everything else.
- Try it at `/picker` on the preview server: the same page imports the library in the browser.

## As a service

The preview server doubles as an HTTP API, so an app can call it instead of depending on the
package. Full reference at `/docs` on the running server; OpenAPI 3.1 at `/api/v1/openapi.json`.

```ts
const params = new URLSearchParams({ input: `${sessionId}:${heroName}`, theme: 'patch', count: '10', svg: '0' });
const { emblems } = await (await fetch(`${EMBLAZON}/api/v1/emblems?${params}`)).json();
// Show emblems[i].url; store the chosen { theme, input, version }.
```

- `GET /api/v1/emblems?input=&theme=&count=1..10&v=&size=&backdrop=dark&rim=&svg=0`: one to ten
  emblems. The first is the plain emblem for the input; the rest are fixed variants (`input#1`, …).
  There is no seed parameter: as with Robohash, the input is the seed.
- `GET /{theme}/{input}.svg?v=` for `<img>` tags, `.json` for metadata, `GET /api/v1/themes`.
- CORS is open, and version-pinned responses are cacheable forever.
- Per-client rate limits (token bucket, `RateLimit-*` headers, 429 with `Retry-After`), strict
  security headers, inert SVGs, request timeouts and size limits.

| Setting | Default | What it does |
|---|---|---|
| `PUBLIC_URL` | from the `Host` header | Base URL for links in responses and docs. Set it in production. |
| `TRUST_PROXY` | off | Behind a proxy or CDN, take client IPs and host from its forwarding headers. Without it, every client behind the proxy shares one limit. |
| `RATE_LIMIT_PER_MINUTE` | `120` | Sustained requests per client per minute; `0` turns limiting off. |
| `RATE_LIMIT_BURST` | `60` | Requests a client may make at once. |


## Credits

Some charges are adapted from [game-icons.net](https://game-icons.net) (CC BY 3.0). Anything that
shows emblems must credit them; the exact line is in [assets/CREDITS.md](assets/CREDITS.md), and
each adapted charge carries it as `CHARGES[id].credit`.

## Run

Needs Node 23.6+ and [just](https://github.com/casey/just). No `npm install`: there are no dependencies.

| Command | What it does |
|---|---|
| `just dev` | site and API with reload on :4747 (`PORT` in `.env`): home and playground `/`, API docs `/docs`, picker `/picker`, sheets `/sheet/{theme}`, emblems at `/api/v1/emblems` and `/{theme}/{input}.svg` |
| `just test` | frozen-version snapshots and corpus digest, rule checks per theme and version, asset contract |
| `just typecheck` | type-check the library as a strict browser app would |
| `just stats [count] [theme] [version]` | how often two inputs look alike |
| `just assets` | redraw geometric charges, re-import game-icons from the vendored copies, validate and compile |
| `just build` | plain ES modules in `dist/` |
| `just docker-up` / `just docker-down` | run the preview server and API in Docker |
| `just release [tag]` | build and push a linux/amd64 image to `REGISTRY_URL` |

Design, asset inventory and roadmap: [docs/PLAN.md](docs/PLAN.md).
