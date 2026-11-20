# VICE HEAT: Leonida Cover Studio
[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Masasiya00/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Masasiya00/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo + caption into a GTA 6-style cover poster — fully offline, in
your browser. No account, no upload, no network request: your photos never
leave your machine.

## What it does

- **5 layouts** — Grid (9 panels, duo big in the centre), Slanted (diagonal
  slices, ghost top / live bottom), Quad (4 panels), Hero (one photo fills
  the frame), and Magazine Spread (hero duo left, mini 2×2 grid right,
  masthead, spine, "ISSUE 01 — LEONIDA").
- **8 colour grades** — Sunset, Neon Night, Twilight Gold, Coral Heat, Vice
  Violet, Mono Noir, Ocean Drive, Bubblegum — each with its own default
  title, plus an intensity slider (0–100%).
- **Per-panel crop** — drag any photo to pan it, scroll to zoom (1×–3×),
  clamped so the photo always covers its panel. Upload your own photo into
  any panel.
- **Editable words** — title, subtitle, tagline and quote; title position
  (top / middle / bottom), outline on/off + width, shadow. Click any role
  label on the poster (e.g. THE DUO) to rename it inline.
- **Shuffle & Reset** — Shuffle randomises the photo assignment, grade and
  title; Reset restores the defaults.
- **Poster furniture** — "LEONIDA ★ EST. 2026" seal, billing block, star
  strip, callouts and quote bar.
- **PNG export in 4 sizes** — 1080×1080, 1080×1350, 1920×1080, 1080×1920,
  one button per size plus Export All.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — the editor. Add `?mode=cover` for a clean
poster with no controls, e.g.
`http://localhost:8080/?mode=cover&layout=magazine&grade=ocean&intensity=70`.

## Dossier screenshots

```sh
node main.ts
```

Starts the server, screenshots the four shots from `shots.json` in headless
Chromium at their literal dimensions, and writes `dossier.json` (plus the
four JPEGs) into `./output` (override with `$MAKEFUN_OUTPUT_DIR`).

## License & sources

Sample photos are free-licensed (Unsplash License, CC BY-SA 4.0, CC BY 3.0,
CC BY 2.0) — see `app/SOURCES.md` for the per-photo table. The display font
is Anton (SIL OFL), vendored locally. No Rockstar Games artwork, logo, or
font is used anywhere. Code is MIT — see `LICENSE`.

Entered on [make.fun](https://make.fun/?ref=cvw0cfes&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards
