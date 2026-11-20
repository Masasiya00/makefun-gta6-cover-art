# VICE HEAT: Leonida Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Masasiya00/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Masasiya00/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn a photo and a caption into GTA 6-style cover art: a multi-panel poster
with bold gradient lettering and a Vice City sunset / neon colour grade.
Fully offline — static files under `app/`, no network requests, photos never
leave your machine.

## What it does

- **5 layouts:** 9-panel grid hero (big duo in the centre), slanted panels,
  4-panel, single hero, and Magazine Spread (hero duo left + 2&times;2 mini
  grid right + masthead + spine + "ISSUE 01 — LEONIDA").
- **8 grades + intensity slider (0–100%):** Sunset, Neon Night, Twilight
  Gold, Coral Heat, Vice Violet, Mono Noir, Ocean Drive, Bubblegum. The
  slider changes the grade for real — pixels at 0% and 100% differ.
- **Crop per panel:** upload your own photo per panel, drag to pan (clamped,
  never leaves a gap) and scroll to zoom.
- **Editable role tags:** click any role label (e.g. "PARTNERS IN CRIME"),
  type the new tag, press Enter.
- **Shuffle** randomises photos, grade and title; **Reset** restores the
  default cover.
- **Title controls:** position (top / middle / bottom), outline on/off,
  outline thickness slider, shadow slider. Big gradient title + subtitle +
  tagline + quote bar, set in Anton.
- **Poster furniture:** "LEONIDA ★ EST. 2026" seal, billing block and star
  strip.
- **Export PNG in 4 sizes, one click each:** 1080&times;1080, 1080&times;1350,
  1920&times;1080, 1080&times;1920 (story).

## How to use

```sh
node serve.ts
```

Then open http://localhost:8080 — pick a layout and a grade, drop your photos
into the panels, edit the title and role tags, and export.

## Licence notes

Sample photos are freely licensed (see `app/SOURCES.md` for every photo,
source and licence). The Anton font is under the SIL Open Font License. No
Rockstar Games logo, artwork, character or font is used — all art, lettering
and grades are original.

Referral: cvw0cfes
