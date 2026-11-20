# VICE HEAT: Leonida Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Masasiya00/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Masasiya00/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn a photo and a caption into GTA-style cover art: a multi-panel poster
with bold gradient lettering and a Vice City sunset or neon colour grade.
Made for the make.fun bounty **gta6-cover-art-01**.

## What it does

- **Five layouts** — 9-panel grid with a big duo in the middle, Slanted
  slices, 4-panel, Single hero, and a Magazine Spread with masthead, spine
  and "ISSUE 01 — LEONIDA".
- **Eight colour grades** — Sunset, Neon Night, Twilight Gold, Coral Heat,
  Vice Violet, Mono Noir, Ocean Drive, Bubblegum — each with an intensity
  slider (0–100%). Every photo first gets the same uniform pre-grade
  (saturate +28%, contrast +12%, warm red lift).
- **Any photo** — upload your own photo into any panel, drag to crop, scroll
  to zoom; the pan clamps so a photo can never slide off its panel.
- **Editable everything** — title (top / middle / bottom, outline on/off,
  outline thickness, shadow), subtitle, tagline, quote bar, and the role tag
  on every panel (click a chip on the cover, type, Enter to save).
- **Shuffle** — randomises photos, grade and title in one click. **Reset**
  restores the VICE HEAT defaults.
- **One-click export** — PNG at 1080 × 1080, 1080 × 1350, 1920 × 1080 and
  1080 × 1920 (story).

The title owns a band of its own (1.78× the title size), panels live only
outside the title band and the furniture strip, and role chips are painted
dead last — so the title never sits on a photo and a chip is never covered.

## How to use

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Open http://localhost:8080, pick a layout and a grade, type your title,
click a panel to select it, upload a photo (or drag the samples around),
then export a PNG. Everything runs offline in the browser; photos are read
on your own machine and never uploaded.

To hand the entry in (or regenerate its screenshots + dossier locally):

```sh
MAKEFUN_CAPTURE=1 MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Screenshots

Four scenes, all shot from the app itself in this session:

1. `1-cover.jpg` — 9-panel grid, Sunset grade, "VICE HEAT".
2. `2-editor.jpg` — the editor at work: Magazine Spread, Ocean Drive at
   70% intensity, with a photo loaded.
3. `3-cover-square.jpg` — Slanted slices, Neon grade, "NEON VICE".
4. `4-cover-portrait.jpg` — Single hero, Twilight grade, "GOLDEN HOUR".

## Licence

- Code: MIT — see [LICENSE](LICENSE).
- Font: Anton, SIL Open Font License 1.1 (`app/fonts/Anton-Regular.ttf`).
- Sample photos: see [app/SOURCES.md](app/SOURCES.md) for sources and
  licences. No Rockstar Games logo, artwork or font is used anywhere.
