# Vendored game-icons.net originals

Unmodified copies of the icons emblazon adapts into heraldic charges, kept in the repo so
builds never depend on the upstream site or repository staying the same.

- Source: https://github.com/game-icons/icons at commit `82d948812bfe3f269ef8f731dcdb07b08160edc4` (2026-04-23)
- License: CC BY 3.0 (see `license.txt`). Attribution is required in anything that shows them.
- `manifest.json` lists which icons are used, under which charge id, name and tags.
- `npm run import-icons` turns these originals into charges in `assets/heraldry/charges/`
  (strips the background square, rescales to the 100×100 asset contract, drops colour) and
  regenerates `assets/CREDITS.md`.

Do not edit the SVGs here. To change an adaptation, change the importer or the manifest.
