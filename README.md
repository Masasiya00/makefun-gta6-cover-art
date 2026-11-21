# VICE HEAT: Leonida Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Masasiya00/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Masasiya00/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo into a GTA 6-style cover art poster — offline, in your browser, no upload to any server.

## What it does

- **5 layouts**: 9-panel grid (hero duo in the centre, like the official cover), slanted panels, 4-panel, single hero, and a Magazine Spread (hero duo left + 2×2 minis right + masthead + spine + "ISSUE 01 — LEONIDA").
- **8 colour grades** (Sunset, Neon Night, Twilight Gold, Coral Heat, Vice Violet, Mono Noir, Ocean Drive, Bubblegum) with an intensity slider from 0–100%.
- **Per-panel photos**: upload your own, drag to crop, scroll to zoom. Photos always cover their panel fully — no gaps.
- **Editable everything**: gradient title (Anton, OFL), subtitle, tagline, quote bar, title position (top / bottom / middle), outline on/off + thickness, shadow.
- **Role tags**: click any tag on the cover to rename it in place.
- **Poster furniture**: "LEONIDA ★ EST. 2026" seal, billing block, star strip, callouts.
- **Shuffle** (random photos + grade + title) and **Reset**.
- **One-click export** to exact PNG sizes: 1080×1080, 1080×1350, 1920×1080, 1080×1920 — or export all four at once.

## Run it

```bash
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies. The app is static files under `app/`.

## Screenshots

The four screenshots in `screenshots/` are taken with Playwright
(`node app/src/shots.js` while the server runs): cover 1920×1080, editor
1280×720, magazine cover 1080×1080, slanted cover 1080×1350.

## License & sources

MIT — see `LICENSE`. All nine sample photos are freely licensed; sources and
licenses are listed in `app/SOURCES.md`. No Rockstar artwork, logo, or font
is used. Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty.
