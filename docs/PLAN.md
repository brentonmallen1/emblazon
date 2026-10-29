# emblazon — plan & design

> **emblazon** (v.): to paint a coat of arms from its written description (its *blazon*).
> Here: to paint an emblem from a hash.

Deterministic, themed avatar generator in the spirit of Robohash. Any input string (email,
username, UUID) always produces the same emblem. Themes are **coats of arms** first, **mission
patches** second, more later. Emblems are imagery only: no text inside them.

Status: **Phase 7 done** — all six jb-rpg themes generate, each from the
directions picked on the samples canvas (§9): `insignia` (hazard tag, neon tag, corp stamp, with
real letters), `sigil` (watching seal, wax seal, thorned rune), `mark` (idol, tablet, forbidden
book), `badge` (flat badge, sticker), and `patch@2` (triangle frames; starship, ring station,
garden dome and orbit scenes in place of the rocket). heraldry v1–v3 and patch v1 are unchanged
byte-for-byte. Lookalike chance per pair: heraldry 1 in ~46,900, patch@2 1 in ~23,300,
insignia 1 in ~56,400, sigil 1 in ~13,900, mark 1 in ~188,700, badge 1 in ~32,300. Every released
version's corpus is frozen by digest. Next: Phase 8 (packaging).

---

## 0. Theme set (modelled on jb-rpg)

emblazon is a **standalone, installable package**: apps add it as a dependency and call it;
emblazon never reaches into an app's code. Its theme set is modelled on the six themes of
jb-rpg (`~/repos/jb-rpg`), a likely first user: there, players would pick a hero's symbol from a
few generated options in the story's theme. Those themes share a look (see the "J&B's RPG —
Cinematic Redesign" design canvas): dark, cinematic, one accent palette per theme.

| Theme (jb-rpg name) | Symbol style | emblazon theme | Status |
|---|---|---|---|
| fantasy | coat of arms | `heraldry` | ✅ v2 |
| deep_space | mission patch: no text, round or triangle frames | `patch` | ✅ v2 |
| cyberpunk | crew tag: hazard tag, neon tag or corp stamp, with letters and numbers | `insignia` | ✅ v1 |
| horror | occult seal: watching seal, wax seal or thorned rune | `sigil` | ✅ v1 |
| insanity | Arkham-style relic: an idol, a carved tablet or a forbidden book | `mark` | ✅ v1 |
| modern | flat badge or die-cut sticker | `badge` | ✅ v1 |

What an app like that needs from the package (Phase 5 delivered these):
- **Runs in the browser** as well as Node: no `node:` imports, synchronous hashing.
- **Options, not just one**: `emblazonOptions(seed, {count})` → N distinct emblems for a picker,
  each with a stable `{input, version}` the app stores.
- **Reads on dark backgrounds**: `backdrop: 'dark'` rim, checked on each theme's screen colour.
- **Attribution**: adapted game-icons art needs a visible credit line in the app.
  `ATTRIBUTION` has it; each emblem lists its `credits`.
- Imported charges are tagged with the themes they suit (`horror`, `insanity`, `modern`, …) so
  later themes can reuse the same vendored art.

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
| `GET /` | playground: type any input, see the emblem, blazon and config |

Responses with a pinned `?v=` are cached as immutable; unpinned ones for an hour.

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
(`scripts/draw-geometric.ts`, `npm run draw`) and committed as SVG; pictorial ones are
hand-authored SVG. `npm run assets` validates and compiles them all. Tags in use: `compact`
(safe on narrow ordinaries), `tall` (sword, key: Phase 3 placement should give them height),
`geometric`.

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
| 20 | Escallop | geometric | ribbed fan; computed, so it lives in the authoring script |

**Phase 4 additions (v2): 45 charges adapted from game-icons.net** (CC BY 3.0), 65 in all.
Traditional beasts (lion's head, eagle displayed, stag's head, boar, wolf's head, owl, raven,
dragon's head, wyvern, griffin, unicorn's head, horse's head, ram's head, bear's head, dolphin,
swan, bee, sea serpent), deliberately untraditional ones (tick, octopus, crab, snail, scarab,
scorpion, hare, frog, turtle, seahorse, jellyfish, ammonite, axolotl, bat, hedgehog, mantis,
dodo, dragonfly, elephant, flamingo, centipede) and objects (rose, oak tree, acorn, castle,
horseshoe, axe).

- **Kept offline:** unmodified originals are vendored in `assets/vendor/game-icons/` with the
  upstream license, commit and a manifest; `npm run import-icons` regenerates the charges from
  them (strip background, normalise path data to absolute 100×100 coordinates, tag
  compact/tall/wide by aspect) and writes `assets/CREDITS.md`.
- **Attribution travels with the art:** each imported charge carries `data-credit`, compiled
  into `CHARGES[id].credit`; the validator refuses adapted art without it.
- **v2 rule:** charges tagged `beast` never go *on* an ordinary (too detailed at ~9px).

Still not in the set (no good source yet): lion rampant/passant as full beasts, garb,
hunting horn, ship. Per pall (needs three-tincture fields) is deferred too.

### 3.3 Placement table (charges per ordinary)

Each entry: positions (field coords), charge size, and which surface the charges sit on
(drives the tincture rule). The generator picks one entry, weighted.

| Ordinary | Options |
|---|---|
| none | 1 large at fess point · 3 in 2-1 · 2 in pale · 3 in pale (4-in-2-2 and 5-in-saltire dropped: they clip on the norman shield) |
| chief | 3 *on* the chief · 1 large in base (on field) |
| fess | 3 *on* the fess · 3 *between* (2 above, 1 below) |
| pale | 3 *on* the pale · 2 *between* (flanking) |
| bend / bend sinister | 3 *on* the bend · 2 *between* |
| chevron | 3 *between* (2-1) · 3 *on* the chevron |
| cross / saltire | 1 *on* at center · 4 *between* (in the angles) |
| pile | 1 *on* near chief · 2 *between* (flanking base) |
| bordure | same as none, scaled to 80% |
| *(no charges)* | allowed for every ordinary, weighted low (0.6), so plain geometric arms exist without crowding the space |

Implemented in `src/themes/heraldry/placements.ts`; positions are resolved into the config, so
the renderer never needs the table.

### 3.4 Rules (enforced in generate(), tested over 10k inputs in `test/generate.test.ts`)
- **Rule of tincture:** metal never on metal, color never on color.
  - Plain field: ordinary and charges on the field take the opposite class.
  - Partition/variation: one metal + one color; anything on top must differ from both.
  - Charges *on* an ordinary take the class opposite to the ordinary.
- Charges *on* an ordinary only use charges tagged `compact` (no swords on a bend).
- Patterned fields take no charges directly, and always get an ordinary (a bare pattern is
  drawn from too few combinations to stay distinct).
- An ordinary never sits on the matching partition line (per bend + bend, quarterly + cross…).
- At most one non-straight line per shield.
- `tall` charges are drawn 12% larger.
- Every weight lives in one table per version (`weights.ts`, `placements.ts`), so tuning is a
  data change — and once a version ships, tuning means a new version.

### 3.5 Blazon
`describe()` produces real blazon text, e.g.
- *Per bend wavy Azure and Or, a chevron Gules between three mullets Argent.*
- *Gules, on a chief Or three hurts.* (roundels named by tincture)
- *Quarterly Argent and Sable, a cross patée counterchanged.* (counterchanging: Phase 4)

### 3.6 Size estimate (MVP)
5 shields × 14 fields × ~5 line styles (where applicable) × 11 ordinaries × ~3 placements
× 20 charges × ~40 valid tincture sets ≈ **tens of millions raw**.

The estimate above assumed uniform picks; real weights concentrate output, so we measure
instead. `npm run stats` generates 10k inputs and treats two emblems as lookalikes when they
share field type and tinctures, ordinary and its tincture, and charge and its tincture
(ignoring shield, line style and count, so it errs toward "alike").

**Target:** the chance that two random inputs look alike is below 1 in 10,000.
(The earlier "< 1% collisions" target was wrong: by the birthday effect, any realistic space
gives many lookalike pairs among 10k users; the per-pair probability is the meaningful number.)

**v1 measured:** 1 in ~18,000 per pair; 97.9% of full configs distinct. First attempt was
1 in ~1,950 with 8% exact duplicates — too many charge-less arms and bare patterned fields;
fixed by re-weighting before release.

---

## 4. Theme 2 — Mission patch: component inventory (Phase 5)

| Component | Options | Method |
|---|---|---|
| Patch shape | 6–8: circle, shield, oval, rounded triangle, chevron-top, hexagon | parametric |
| Border | 4–6: single, double, stitched, beaded | procedural; no text ring (emblems are imagery only) |
| Background | 6–10: deep space gradient, starfield, nebula, horizon | procedural, seeded |
| Celestial body | 10–15: Earth limb, Moon, Mars, ringed giant, gas giant, ice world | procedural (turbulence bands, craters, rings, terminator) |
| Vehicle | 6 kinds | parametric code, no assets: rockets (nose × fins × boosters × stages × flame), capsule, lander, rover, satellite, probe. The top-down shuttle was dropped: it read badly |
| Trajectory | 6–10 | seeded Bézier swooshes / orbit ellipses, tapered |
| Accents | ~10 | crew stars (count = crew), flag stripes, constellation, astronaut silhouette |
| Palette | 10–15 | data |
| Name (description only) | mission name, e.g. "Artemis-7" | word lists (Greek letters, mythology, stars, virtues); returned as the description, never drawn |

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
| **4. Heraldic depth** ✅ | 45 game-icons charges (vendored, credited), furs (ermine, ermines, erminois, pean, vair), counterchanging, v1 frozen by a corpus digest test | `heraldry@2` released; v1 byte-identical; v2 lookalike chance 1 in ~51,700 per pair, 99.1% distinct |
| **5. App-ready library** ✅ | pure-JS sync SHA-256 (identical output), `emblazonOptions(seed, {count})` (distinct looks and charges, stable, each stores `{input, version}`), `backdrop: 'dark'` rim, `ATTRIBUTION` + per-emblem `credits`, `exports` → `src/`, `npm run build` → `dist/`, `/picker` demo running in the browser | the picker runs client-side (6 options in ~3 ms); `src/` passes a strict browser `tsc` (`tsconfig.browser.json`); built JS matches source byte-for-byte |
| **6. Mission patches + flat style** ✅ | flat `patch@1`: 6 frame shapes, 4 ring styles, 16 accent palettes, 7 flat bodies (incl. the mock-up's dune world), parametric craft (rocket, capsule, lander, rover, satellite, probe), orbit/swoosh, crew stars in the band; flat `heraldry@3`; `style` option; per-version default style | patch 1 in ~11,400 lookalike pairs; heraldry v1–v3 and patch v1 frozen by corpus digests |
| **7. The remaining theme styles** | flat like jb-rpg's mock-ups: `insignia` (cyberpunk crew tag), `sigil` (horror: line-art seal, eye/triangle/circle motifs), `mark` (insanity: restless spiral line work), `badge` (modern), reusing vendored art by theme tag | each meets the same gates on its theme's background |
| **8. Packaging** | installable package: published (npm or a git dependency) with `dist/` JS and `.d.ts` types alongside the TS source; PNG via resvg; Docker image for the HTTP service | an app adds it with one install command and imports it |
| **9. Achievement mode** (optional) | imagery-only display around the shield for large sizes: helm, crest, mantling, supporters; no motto | — |

---

## 8. Open decisions

1. ~~Beasts and complex charges~~ — decided: game-icons.net, vendored with attribution; untraditional
   creatures welcome.
2. ~~Browser support timing~~ — decided: needed now for jb-rpg (Phase 5); bundled sync sha256.
3. **Theme style mapping (§0):** confirm the proposed symbol style per jb-rpg theme before
   Phase 7.
4. **Where it's published** so apps can install it: npm (public or private) or a git
   dependency (needs a remote for this repo). Apps never vendor or copy its source.
5. **Raster output:** is SVG-only fine for the first deploy?
6. **Deploy target:** self-hosted Docker (e.g. Unraid) vs. a static/edge function.
7. **License** for code and original art (e.g. MIT code + CC BY art).
8. ~~Style direction~~ — decided: match jb-rpg's flat mock-ups (two or three colours, thin
   accent line work, no shading). Versions released before this keep their look; the
   `style` render option can still ask for `classic` heraldry. Still open: **text** — the
   mock-ups put the hero's name on the patch ring and initials on the cyberpunk tag; emblazon
   draws no text yet. Would need the name passed in (it isn't the seed) and fonts as paths.
---

## 9. Direction picks (samples canvas, 2026-10-28)

Sample designs: https://claude.ai/artifact/7QGj58L2K7oWrMLtHq9HCN (private canvas).

- **Cyberpunk (`insignia`):** all three directions become sub-styles, picked per hero for variety:
  hazard tag (neon fill, big initials, barcode, serial), neon outline (dark tag, glowing outlined
  letters, corner brackets, pixel code), corp stamp (neon frame, initials, vertical barcode,
  hazard band). Real letters and numbers (initials from the hero's name, serials), drawn with
  the built-in stroke font.
- **Horror (`sigil`):** all three as sub-styles: watching seal (line art), wax seal (filled,
  embossed motif, drips), thorned rune.
- **Insanity:** the first three samples missed — needs Lovecraftian / elder-god vibes. Second
  round in progress: tentacles from a void, an elder-sign-like branching star, a cosmic maw.
- **Modern (`badge`):** flat badge and sticker as sub-styles; the monoline monogram is dropped.
- **Deep space (`patch`):** no text. Add triangular frames. Better interiors: futuristic craft
  (not the current rocket), orbits, plants, satellites/stations.
