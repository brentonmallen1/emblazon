# emblazon — plan & design

> **emblazon** (v.): to paint a coat of arms from its written description (its *blazon*).
> Here: to paint an emblem from a hash.

Deterministic, themed avatar generator in the spirit of Robohash. Any input string (email,
username, UUID) always produces the same emblem. Themes are **coats of arms** first, **mission
patches** second, more later.

Status: **Phase 1 done** (core + procedural heraldry, preview sheet at `npm run dev`). Next: Phase 2.

---

## 1. Goals and non-goals

**Goals**
- Same input + theme + version → byte-identical SVG, forever.
- Legible and distinct at avatar sizes (32–64px), good-looking at 256px+.
- Large *visually distinct* space: ≥ 50k combinations of the salient features per theme.
- Most variety comes from procedural code; hand-drawn assets only where code can't do it.
- Zero runtime dependencies for the core library; runs in Node and (later) the browser.
- Every output can be described in words (heraldry: a real blazon; patches: mission name).

**Non-goals (for now)**
- Historical accuracy beyond "a heraldry nerd wouldn't wince."
- Full heraldic achievements (helm, mantling, supporters) at avatar size — optional later mode.
- User-editable avatars. Output is a pure function of the input.

---

## 2. Architecture

```
input ──normalize──▶ sha256 ──per-slot seeds──▶ generate() ──config JSON──▶ render() ──▶ SVG
                                                    │                                    │
                                                    └──▶ describe() ──▶ blazon / name    └──▶ (later) PNG
```

- **Seeding:** each slot gets its own RNG seeded from
  `sha256("v{version}:{theme}:{slot}:{input}")` → mulberry32. Adding a new slot never
  reshuffles existing slots.
- **generate()** is pure: RNG → a plain config object (e.g. `{shield, field, ordinary,
  charges, ...}`). Rules live here (rule of tincture, placement compatibility).
- **render()** is pure: config → SVG string. No randomness in render.
- **describe()**: config → human text.
- The config is the stable contract. It can be stored per account, diffed, tested, and
  re-rendered by future renderer versions.

### Versioning
Asset lists and option weights are **frozen per theme version**. Adding a charge means
`heraldry@2`; `heraldry@1` keeps producing the same images. The API takes `?v=` and defaults
to the latest; apps that need stability pin a version (or store the config).

### Repo layout (target)

```
assets/heraldry/charges/*.svg     source art, one charge per file (see §5 contract)
src/core/                         hash, rng, pick/weighted pick, svg helpers, contrast
src/themes/heraldry/
  tinctures.ts                    palette + metal/color classes
  shields.ts                      shield outlines (parametric paths)
  lines.ts                        line-of-partition edge generator
  fields.ts                       partitions + variations of the field
  ordinaries.ts                   ordinary geometry
  placements.ts                   where charges go, per ordinary
  charges.generated.ts            compiled from assets/ by the build script (do not edit)
  generate.ts  render.ts  blazon.ts  index.ts
src/index.ts                      emblazon(input, { theme, version, size })
scripts/build-assets.ts           validate + compile SVG assets
scripts/sheet.ts                  contact sheets (HTML)
scripts/stats.ts                  distinctness / collision report
src/preview/                      contact-sheet HTML builders (used by server and scripts)
server.ts                         node:http preview + API
test/                             node:test
```

**Tooling:** TypeScript run directly by Node 26 (native type stripping), `node:test`,
`node:crypto`, `node:http`. No bundler, no runtime deps. `@resvg/resvg-js` only when PNG
output is added (Phase 6).

### API (preview server, later the deployable service)
| Route | Returns |
|---|---|
| `GET /{theme}/{input}.svg?size=&v=` | the emblem |
| `GET /{theme}/{input}.json?v=` | config + description |
| `GET /sheet/{theme}` | contact sheet: random emblems, every asset, every procedural option |

---

## 3. Theme 1 — Heraldry: component inventory

Canvas: `viewBox="0 0 240 240"`. The shield's field occupies a 200×220 box at (20,10).
All heraldic geometry is authored in **field coordinates** (0–200 × 0–220):
fess point (center) = (100,100); chief = top third (y 0–66).

Layers, bottom to top:
1. Field (one tincture, a partition of two, or a variation pattern) — clipped to shield
2. Ordinary (optional) — clipped to shield
3. Charges — on the field or on the ordinary, depending on placement
4. Shield outline + subtle shading/highlight overlay
Every ordinary and charge gets a thin dark outline (drawn as a 2× stroke underneath the fill,
so unions like a cross have no interior seams). This keeps contrast safe on divided fields.

### 3.1 Procedural components (code, no art)

| Component | Options (MVP) | Notes |
|---|---|---|
| **Shield shape** | 5: heater, French, Spanish (round base), Swiss (dipped top), Norman/kite | Path also used as clip mask. Later: lozenge, oval, roundel. |
| **Line of partition** | 7: straight, wavy, indented, dancetty, embattled, engrailed, invected | `edge(p1, p2, style, period)` → path segment. Applies to partitions and ordinary edges. Later: nebuly, raguly, dovetailed. |
| **Partitions** (2 tinctures) | 8: per pale, per fess, per bend, per bend sinister, per chevron, per saltire, quarterly, gyronny | Line styles apply to all but gyronny. Per pall needs three tinctures, so it moves to Phase 4. |
| **Variations** (patterns) | 5: paly, barry, bendy, chequy, lozengy | Straight lines only; fixed counts (6/8). |
| **Ordinaries** | 10 + none: chief, fess, pale, bend, bend sinister, chevron, cross, saltire, pile, bordure | Line styles on long edges, except pile and bordure (always plain). Later: canton, pall, chevronels, bars, flaunches. |
| **Tinctures** | 7: Or, Argent (metals); Gules, Azure, Vert, Sable, Purpure (colors) | Tuned palette, not pure RGB. Furs (ermine, vair) are procedural patterns in Phase 4. |
| **Placements** | per ordinary, see §3.3 | Data table, not code. |
| **Finish** | shading overlay, outline weight | Fixed per version. |

### 3.2 Drawn components (SVG assets) — MVP charges

20 single-color charges. Geometric ones are generated by an authoring script
(`scripts/draw-geometric.ts`) and committed as SVG; pictorial ones are hand-authored SVG.

| # | Charge | Method | Notes |
|---|---|---|---|
| 1 | Mullet (5-pt star) | geometric | |
| 2 | Mullet of six points | geometric | |
| 3 | Estoile | geometric | 6 wavy rays |
| 4 | Sun in splendour | geometric | disc + alternating straight/wavy rays |
| 5 | Roundel | geometric | blazon name depends on tincture (bezant, plate, torteau, hurt, pomme, pellet, golpe) |
| 6 | Annulet | geometric | ring, evenodd |
| 7 | Lozenge | geometric | |
| 8 | Mascle | geometric | voided lozenge |
| 9 | Crescent | geometric | |
| 10 | Cross patée | geometric | |
| 11 | Cross crosslet | geometric | |
| 12 | Heart | hand | |
| 13 | Fleur-de-lis | hand | the hardest of the MVP set; worth extra polish |
| 14 | Key | hand | bow, shaft, bit |
| 15 | Tower | hand | crenellations, door/window cutouts |
| 16 | Crown | hand | |
| 17 | Sword | hand | point up |
| 18 | Anchor | hand | |
| 19 | Bell | hand | |
| 20 | Escallop | hand | ribbed fan |

**Phase 4 additions (needs a sourcing decision, see §8):** lion rampant, lion passant, eagle
displayed, stag's head, boar's head, dragon, griffin, tree, hunting horn, axe, hammer, castle,
ship, bee, rose, trefoil, garb (wheat sheaf). Target ~50 charges total by end of Phase 4.

### 3.3 Placement table (charges per ordinary)

Each entry: positions (field coords), charge size, and which surface the charges sit on
(drives the tincture rule). The generator picks one entry, weighted.

| Ordinary | Options |
|---|---|
| none | 1 large at fess point · 3 in 2-1 · 2 in pale · 3 in pale · 4 (2-2) · 5 in saltire |
| chief | 3 *on* the chief · 1 large in base (on field) · both |
| fess | 3 *on* the fess · 3 *between* (2 above, 1 below) |
| pale | 3 *on* the pale · 2 *between* (flanking) |
| bend / bend sinister | 3 *on* the bend · 2 *between* |
| chevron | 3 *between* (2-1) · 3 *on* the chevron |
| cross / saltire | 1 *on* at center · 4 *between* (in the angles) |
| pile | 1 *on* near chief · 2 *between* (flanking base) |
| bordure | same as none, scaled to 80% |
| *(no charges)* | allowed for every ordinary, weighted lower, so plain geometric arms exist |

### 3.4 Rules (enforced in generate(), tested over 10k seeds)
- **Rule of tincture:** metal never on metal, color never on color.
  - Plain field: ordinary and charges on the field take the opposite class.
  - Partition/variation: one metal + one color; anything on top must differ from both.
  - Charges *on* an ordinary take the class opposite to the ordinary.
- Charges *on* a narrow ordinary only use charges tagged `compact` (no swords on a bend).
- Patterned fields (chequy, lozengy) take no small charges on the field — legibility.
- Every weight lives in one table per version so tuning is a data change.

### 3.5 Blazon
`describe()` produces real blazon text, e.g.
- *Per bend wavy Azure and Or, a chevron Gules between three mullets Argent.*
- *Gules, on a chief Or three hurts.* (roundels named by tincture)
- *Quarterly Argent and Sable, a cross patée counterchanged.* (counterchanging: Phase 4)

### 3.6 Size estimate (MVP)
5 shields × 14 fields × ~5 line styles (where applicable) × 11 ordinaries × ~3 placements
× 20 charges × ~40 valid tincture sets ≈ **tens of millions raw**.

Salient-feature space (what you notice at 48px: field tinctures × field type × ordinary ×
charge) ≈ 40 × 14 × 11 × 20 ≈ **120k**. Target met. `scripts/stats.ts` measures the actual
collision rate of the salient tuple over N random inputs instead of trusting this math.

---

## 4. Theme 2 — Mission patch: component inventory (Phase 5)

| Component | Options | Method |
|---|---|---|
| Patch shape | 6–8: circle, shield, oval, rounded triangle, chevron-top, hexagon | parametric |
| Border | 4–6: single, double, stitched, text ring (top/bottom arcs) | procedural; text via `<textPath>`, then converted to paths |
| Background | 6–10: deep space gradient, starfield, nebula, horizon | procedural, seeded |
| Celestial body | 10–15: Earth limb, Moon, Mars, ringed giant, gas giant, ice world | procedural (turbulence bands, craters, rings, terminator) |
| Vehicle | ~2,000 combos | assembled from ~25 drawn parts: noses, bodies, fins, boosters, plumes; + capsules, landers, satellites; + 3–5 hero pieces (shuttle, rover) |
| Trajectory | 6–10 | seeded Bézier swooshes / orbit ellipses, tapered |
| Accents | ~10 | crew stars (count = crew), flag stripes, constellation, astronaut silhouette |
| Palette | 10–15 | data |
| Text | mission name + crew names | word lists (Greek letters, mythology, stars, virtues) + syllable generator; OFL font (Oswald / Barlow Condensed) converted to paths with opentype.js at build time |

Same contract as heraldry: generate → config → render → describe ("Artemis-7 · Crew of 4").

---

## 5. Asset contract and pipeline

Every drawn asset (any theme) must satisfy, enforced by `scripts/build-assets.ts`:
- `viewBox="0 0 100 100"`; artwork inside the 5–95 safe area, visually centered.
- Shapes only (`path`, `circle`, `rect`, `polygon`, `ellipse`, `g`). No `<text>`, `<image>`,
  filters, gradients, or transforms (flattened).
- **No `fill`/`stroke` attributes** — color is inherited from the renderer. Cutouts use
  `fill-rule="evenodd"`. Multi-tone assets (patches) use `class="c1|c2|c3"` slots.
- Metadata on the root element:
  `data-id`, `data-name`, `data-plural`, `data-weight`, `data-tags` (e.g. `compact,geometric`).
- Must stay legible at 32px: build renders a coverage check (filled-area ratio within bounds)
  once PNG support exists; until then, the contact sheet's 32px row is the gate.

Build output: `src/themes/<theme>/*.generated.ts` with inner SVG markup + metadata, so the
library needs no filesystem access at runtime (browser-safe).

**Sourcing order:** procedural → geometric authoring script → hand-authored SVG →
open-license icon sets (game-icons.net, CC BY 3.0, attribution page) → AI image + vtracer/
potrace + manual cleanup. All non-original assets recorded in `assets/CREDITS.md`.

---

## 6. Quality gates

- **Determinism tests:** fixed inputs → snapshot of config JSON and SVG hash.
- **Rule tests:** 10k random inputs → every config passes the tincture/placement rules.
- **Contact sheets** (`/sheet/heraldry`):
  1. every shield × every partition × every line style
  2. every ordinary × line styles
  3. every charge in every tincture, at 32 / 48 / 128px
  4. 200 random emblems at 48px, blazon on hover
- **Distinctness report:** salient-tuple collision rate over 10k inputs (target < 1%).

---

## 7. Phases

| Phase | Scope | Done when |
|---|---|---|
| **0. Plan** | this doc, repo, name | plan approved |
| **1. Core + procedural heraldry** | tooling, `core/` (hash, rng, picks), tinctures, shields, line styles, partitions, variations, ordinaries; preview server; sheet sections 1–2 | every procedural option renders cleanly on the sheet |
| **2. Charges** | geometric authoring script, 9 hand-drawn charges, build/validate script, sheet section 3 | 20 charges pass validation and read at 32px |
| **3. Generation** | placements, rules, `generate` / `render` / `blazon`, API routes, tests, stats, sheet section 4 | 200-emblem sheet looks good; rule + determinism tests pass; collisions < 1% |
| **4. Heraldic depth** | furs, counterchanging, beasts & more charges (~50), shading finish, optional "achievement" mode (helm, mantling, motto) for large sizes | `heraldry@2` released; v1 output unchanged |
| **5. Mission patches** | §4 inventory, parts-based vehicles, text pipeline | `patch@1` meets the same gates |
| **6. Packaging** | browser build (WebCrypto or bundled sha256), PNG via resvg, caching headers, Docker image for self-hosting, npm package | `docker run` serves both themes |
| **7. More themes** | backlog: unit insignia, sci-fi faction emblems, guild banners, wax seals | — |

---

## 8. Open decisions

1. **Beasts and complex charges (Phase 4):** game-icons.net (fast, consistent, CC BY
   attribution), AI-generated + vectorized (custom look, cleanup cost, check tool terms), or
   hand-drawn/commissioned (best, slowest). Can mix.
2. **Browser support timing:** needed before Phase 6? Affects whether sha256 is sync (bundled)
   or async (WebCrypto) in the public API.
3. **Raster output:** is SVG-only fine for the first deploy?
4. **Deploy target:** self-hosted Docker (e.g. Unraid) vs. a static/edge function.
5. **License** for code and original art (e.g. MIT code + CC BY art).
