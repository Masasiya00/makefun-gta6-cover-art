[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Masasiya00/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Masasiya00/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# VICE HEAT: Leonida Cover Studio

Turn your own photos into GTA 6-style cover art — the multi-panel Vice City
poster look with bold caption lettering and a neon-sunset grade — and export
it as a PNG to share. Everything runs offline in your browser: photos are
read on your own machine and never uploaded.

## What it does

- **5 layouts** — 9-panel grid with a hero centre, slanted slices, 4-panel,
  single hero, and a Magazine Spread (hero duo + 2×2 mini grid, masthead,
  spine, "ISSUE 01 — LEONIDA").
- **8 colour grades** — Sunset, Neon Night, Twilight Gold, Coral Heat, Vice
  Violet, Mono Noir, Ocean Drive, Bubblegum — with a 0–100% intensity slider.
- **Any photo, per panel** — upload your own photo into any panel, drag to
  reposition the crop, scroll to zoom. The photo always covers the panel
  fully; no gaps or strips.
- **Editable role tags** — click a pill on any panel to rename it
  (The Duo, Getaway Driver, Air Support…).
- **Title controls** — caption text, top/middle/bottom position, outline
  on/off with thickness slider, shadow slider. Long titles shrink
  automatically to fit.
- **Shuffle** — randomises photos, grade and title in one click.
- **One-click export** — PNG in 1080×1080, 1080×1350, 1920×1080 or
  1080×1920 (story).
- **Poster furniture** — "LEONIDA ★ EST. 2026" seal, billing block, star
  strip and callouts, drawn on every export.

## How to use it

```sh
node serve.ts
# open http://localhost:8080/
```

1. Pick a layout and a grade.
2. Click a panel to select it, then **Upload photo** to put your own photo
   in it (or pick a sample from the panel's dropdown). Drag to crop, scroll
   to zoom.
3. Click a role pill to rename it. Type your caption, set its position,
   outline and shadow.
4. Hit **Shuffle** for ideas, **Export PNG** when it looks right.

To retake the screenshots: `node app/src/shots.js` (needs the server
running and Playwright installed). To build the submission dossier:
`MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts`.

## Licence

MIT — see [LICENSE](LICENSE). Sample photos are free-licensed; their
sources are listed in [app/SOURCES.md](app/SOURCES.md). No Rockstar Games
logo, artwork or font is used.
