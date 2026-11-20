# VICE HEAT: Leonida Cover Studio

[![make.fun](https://make.fun/badge/bounty/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun owner](https://make.fun/badge/owner/Masasiya00.svg)](https://make.fun/@Masasiya00)
[![make.fun repo](https://make.fun/badge/repo/Masasiya00/makefun-gta6-cover-art.svg)](https://github.com/Masasiya00/makefun-gta6-cover-art)

Ubah foto apapun jadi cover art gaya GTA 6 — langsung di browser, offline,
tanpa upload. Isi panel dengan fotomu sendiri atau 9 foto sampel, atur
layout, colour grade, judul, dan export PNG siap posting.

Bounty: [gta6-cover-art-01 — Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)

## Fitur

- **5 layout**: 9-Panel Cover Grid (duo tengah besar), Slanted Panels,
  4-Panel, Single Hero, dan **Magazine Spread** (double-page: hero kiri +
  grid mini 2×2 kanan).
- **8 colour grade**: Sunset, Neon Night, Twilight Gold, Coral Heat,
  Vice Violet, Mono Noir, **Ocean Drive** (teal/cyan), **Bubblegum**
  (pink) — plus **slider intensitas grade 0–100%**.
- **Role tag bisa diedit**: klik label di panel, ketik teks baru.
- **Shuffle**: mengacak foto tiap panel + grade + judul (VICE HEAT,
  NEON VICE, GOLDEN HOUR, LEONIDA NIGHTS, SUNSET HEIST).
- **Kontrol judul**: teks, posisi (atas/tengah/bawah), outline + ketebalan,
  intensitas bayangan.
- **Crop per panel**: klik panel untuk memilih, drag foto untuk menggeser,
  scroll/slider untuk zoom — foto selalu menutupi panel penuh.
- **Export 1 klik**: PNG **1080×1080, 1080×1350, 1920×1080, 1080×1920**
  (story), atau Export All untuk keempatnya sekaligus.
- **Poster furniture**: seal bundar LEONIDA ★ EST. 2026, billing block,
  strip 5 bintang, tagline, dan quote bar.

## Cara pakai

```sh
node serve.ts
# buka http://localhost:8080
```

1. Pilih layout (1 · LAYOUT) dan colour grade + intensitas (2 · COLOUR GRADE).
2. Klik panel di cover, lalu pilih foto sampel, upload fotomu, atau drag
   foto di cover untuk crop. Klik label role di panel untuk mengganti
   teksnya.
3. Atur judul, posisi, outline, dan bayangan.
4. Export PNG di ukuran yang kamu mau — atau Shuffle kalau mau kejutan.

Tidak ada build step dan tidak ada network request: semua file ada di
`app/`, font Anton di-vendor di `app/fonts/`.

## Screenshot headless + dossier

```sh
MAKEFUN_OUTPUT_DIR=/tmp/vice-heat-out node main.ts
# me-render 4 screenshot, menyalin app/ + screenshots/ ke output,
# dan menulis dossier.json
```

## Lisensi

MIT — lihat `LICENSE`. Foto sampel berlisensi bebas (daftar lengkap di
`app/SOURCES.md`). Tanpa aset Rockstar Games: tanpa logo, artwork, atau
font dari game.
