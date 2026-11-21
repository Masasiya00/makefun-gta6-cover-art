// cover.js — the cover renderer for VICE HEAT: Leonida Cover Studio.
// Draws every layout, grade, title band and poster furniture onto a canvas,
// and owns the single source of truth for role-chip geometry (chipRect).
// Pure canvas code: no network, no Rockstar assets, all art is our own.

export const SAMPLE_FILES = {
  duo: 'samples/duo.jpg',
  beach: 'samples/beach.jpg',
  skyline: 'samples/skyline.jpg',
  car: 'samples/car.jpg',
  heli: 'samples/heli.jpg',
  pool: 'samples/pool.jpg',
  gator: 'samples/gator.jpg',
  boulevard: 'samples/boulevard.jpg',
  pier: 'samples/pier.jpg',
};

export const PHOTO_NAMES = Object.keys(SAMPLE_FILES);

export const LAYOUTS = {
  grid9: { label: '9-Panel Grid', panels: 9 },
  slanted: { label: 'Slanted', panels: 4 },
  panel4: { label: '4-Panel', panels: 4 },
  single: { label: 'Single Hero', panels: 1 },
  magazine: { label: 'Magazine Spread', panels: 5 },
};

export const GRADES = {
  sunset: { label: 'Sunset', top: '#ff9a3c', bottom: '#e5484d', tint: '#ff6b35' },
  neon: { label: 'Neon Night', top: '#00e5ff', bottom: '#ff2fb3', tint: '#7b2fff' },
  twilight: { label: 'Twilight Gold', top: '#ffd166', bottom: '#8e44ad', tint: '#f4a259' },
  coral: { label: 'Coral Heat', top: '#ff7e5f', bottom: '#feb47b', tint: '#ff5e62' },
  violet: { label: 'Vice Violet', top: '#a855f7', bottom: '#ec4899', tint: '#8b5cf6' },
  mono: { label: 'Mono Noir', top: '#e5e5e5', bottom: '#111111', tint: '#888888' },
  ocean: { label: 'Ocean Drive', top: '#38bdf8', bottom: '#0ea5e9', tint: '#0284c7' },
  bubblegum: { label: 'Bubblegum', top: '#ff8fd1', bottom: '#ffd166', tint: '#ff6fb5' },
};

export const SHUFFLE_TITLES = [
  'VICE HEAT', 'LEONIDA NIGHTS', 'OCEAN DRIVE', 'SUNSET STRIP',
  'NEON PALMS', 'VICE CITY', 'GATOR BAIT', 'BOULEVARD KINGS',
];

export const DEFAULT_TAGS = {
  grid9: ['THE DUO', 'VICE BEACH', 'OCEAN DRIVE', 'GETAWAY DRIVER', 'AIR SUPPORT', 'POOLSIDE', 'LEONIDA WILD', 'BOULEVARD', 'THE PIER'],
  slanted: ['THE DUO', 'GETAWAY DRIVER', 'AIR SUPPORT', 'LEONIDA WILD'],
  panel4: ['THE DUO', 'VICE BEACH', 'GETAWAY DRIVER', 'THE PIER'],
  single: ['THE DUO'],
  magazine: ['THE DUO', 'VICE BEACH', 'GETAWAY DRIVER', 'POOLSIDE', 'THE PIER'],
};

export const DEFAULT_PHOTOS = {
  grid9: ['duo', 'beach', 'skyline', 'car', 'heli', 'pool', 'gator', 'boulevard', 'pier'],
  slanted: ['duo', 'car', 'heli', 'gator'],
  panel4: ['duo', 'beach', 'car', 'pier'],
  single: ['duo'],
  magazine: ['duo', 'beach', 'car', 'pool', 'pier'],
};

export function defaultPanels(layout) {
  const n = LAYOUTS[layout].panels;
  const photos = DEFAULT_PHOTOS[layout];
  const tags = DEFAULT_TAGS[layout];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      photo: photos[i % photos.length],
      tag: tags[i % tags.length],
      crop: { x: 0.5, y: 0.5, zoom: 1 },
    });
  }
  return out;
}

export function defaultState() {
  return {
    layout: 'grid9',
    grade: 'sunset',
    gradeIntensity: 80,
    title: 'VICE HEAT',
    titlePos: 'top',
    titleOutline: true,
    outlineWidth: 6,
    titleShadow: 14,
    panels: defaultPanels('grid9'),
  };
}

// Title font size: shrinks automatically for long titles so the caption
// always fits the stage width. Base size is 8.5% of the stage width.
export function titleFontSize(title, W) {
  const base = W * 0.085;
  const text = (title || 'VICE HEAT').toUpperCase();
  const approx = text.length * 0.62 * base;
  if (approx <= W * 0.94) return base;
  return Math.max(W * 0.03, (W * 0.94) / (text.length * 0.62));
}

// Panel zone: everything outside the title band and the furniture strip.
// The title gets its own horizontal band, 1.78x the title size tall.
// Position "middle" falls back to the top band (a centred band would cut
// the panel zone in two and strand panels above and below it).
export function panelZone(state, W, H) {
  const size = titleFontSize(state.title, W);
  const bandH = 1.78 * size;
  const furnitureH = H * 0.085;
  const pos = state.titlePos === 'bottom' ? 'bottom' : 'top';
  if (pos === 'bottom') {
    return { x: 0, y: 0, w: W, h: H - furnitureH - bandH, bandY: H - furnitureH - bandH, bandH, furnitureH, size };
  }
  return { x: 0, y: bandH, w: W, h: H - furnitureH - bandH, bandY: 0, bandH, furnitureH, size };
}

// Panel rects in canvas coordinates for each layout, inside the zone.
export function layoutPanels(layout, zone) {
  const { x, y, w, h } = zone;
  const gap = Math.max(2, w * 0.006);
  if (layout === 'grid9') {
    const cw = (w - gap * 2) / 3;
    const ch = (h - gap * 2) / 3;
    const rects = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        rects.push({ x: x + c * (cw + gap), y: y + r * (ch + gap), w: cw, h: ch, slant: 0 });
      }
    }
    return rects;
  }
  if (layout === 'slanted') {
    const sw = w / 4;
    const slant = h * 0.14;
    const rects = [];
    for (let i = 0; i < 4; i++) {
      rects.push({ x: x + i * sw, y, w: sw, h, slant, slantDir: i % 2 === 0 ? 1 : -1, split: true });
    }
    return rects;
  }
  if (layout === 'panel4') {
    const cw = (w - gap) / 2;
    const ch = (h - gap) / 2;
    return [
      { x, y, w: cw, h: ch, slant: 0 },
      { x: x + cw + gap, y, w: cw, h: ch, slant: 0 },
      { x, y: y + ch + gap, w: cw, h: ch, slant: 0 },
      { x: x + cw + gap, y: y + ch + gap, w: cw, h: ch, slant: 0 },
    ];
  }
  if (layout === 'single') {
    return [{ x, y, w, h, slant: 0 }];
  }
  // magazine: hero duo on the left, a 2x2 mini grid on the right.
  const heroW = w * 0.56;
  const gridX = x + heroW + gap;
  const gridW = w - heroW - gap;
  const cw = (gridW - gap) / 2;
  const ch = (h - gap) / 2;
  return [
    { x, y, w: heroW, h, slant: 0, hero: true },
    { x: gridX, y, w: cw, h: ch, slant: 0 },
    { x: gridX + cw + gap, y, w: cw, h: ch, slant: 0 },
    { x: gridX, y: y + ch + gap, w: cw, h: ch, slant: 0 },
    { x: gridX + cw + gap, y: y + ch + gap, w: cw, h: ch, slant: 0 },
  ];
}

// Role-chip geometry — the ONE source of truth for chips. main.js imports
// this; it never recomputes chip rects with its own formula.
export function chipRect(state, W, H) {
  const zone = panelZone(state, W, H);
  const rects = layoutPanels(state.layout, zone);
  const size = titleFontSize(state.title, W);
  const chipH = Math.max(18, size * 0.34);
  const padX = chipH * 0.55;
  return rects.map((r, i) => {
    const panel = state.panels[i];
    const label = panel ? panel.tag : '';
    const textW = label.length * chipH * 0.42;
    const cw = textW + padX * 2;
    // Chips sit in the lower half of their panel (slanted slices are split:
    // ghost top half carries no chip, the bottom half carries it).
    const cy = r.y + r.h - chipH - Math.max(6, r.h * 0.03);
    return { x: r.x + Math.max(6, r.w * 0.03), y: cy, w: Math.min(cw, r.w - 12), h: chipH, panel: i, label };
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Draw one photo so it always covers its panel fully: the crop is clamped
// so no gap or strip can ever show at a panel edge.
function drawPhotoCover(ctx, img, rect, crop) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const zoom = Math.max(1, crop.zoom || 1);
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Pan offsets, clamped so the photo still covers the whole rect.
  const maxX = Math.max(0, (dw - rect.w) / 2);
  const maxY = Math.max(0, (dh - rect.h) / 2);
  const ox = Math.max(-maxX, Math.min(maxX, (0.5 - (crop.x ?? 0.5)) * dw));
  const oy = Math.max(-maxY, Math.min(maxY, (0.5 - (crop.y ?? 0.5)) * dh));
  ctx.drawImage(img, rect.x + (rect.w - dw) / 2 + ox, rect.y + (rect.h - dh) / 2 + oy, dw, dh);
}

function slantPath(ctx, r) {
  const s = r.slant * (r.slantDir || 1);
  ctx.beginPath();
  ctx.moveTo(r.x + s, r.y);
  ctx.lineTo(r.x + r.w + s, r.y);
  ctx.lineTo(r.x + r.w - s, r.y + r.h);
  ctx.lineTo(r.x - s, r.y + r.h);
  ctx.closePath();
}

function drawGrade(ctx, state, W, H) {
  const g = GRADES[state.grade] || GRADES.sunset;
  const a = Math.max(0, Math.min(100, state.gradeIntensity ?? 80)) / 100;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, g.top);
  grad.addColorStop(1, g.bottom);
  ctx.save();
  ctx.globalAlpha = a * 0.38;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a * 0.16;
  ctx.fillStyle = g.tint;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawTitle(ctx, state, W, H, zone) {
  const size = zone.size;
  const cx = W / 2;
  const cy = zone.bandY + zone.bandH / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px Anton, "Arial Black", sans-serif`;
  const text = (state.title || 'VICE HEAT').toUpperCase();
  if (state.titleShadow > 0) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = state.titleShadow;
    ctx.shadowOffsetY = size * 0.06;
  }
  if (state.titleOutline) {
    ctx.lineWidth = Math.max(1, state.outlineWidth ?? 6) * (size / 90);
    ctx.strokeStyle = '#111111';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, cx, cy);
  }
  const grad = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#ffe9a8');
  grad.addColorStop(1, '#ff9a3c');
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

function drawFurniture(ctx, state, W, H, zone) {
  const stripY = H - zone.furnitureH;
  const r = Math.max(20, Math.round(H * 0.0315)); // seal radius ~34 at 1080 tall
  const cx = W * 0.5;
  const cy = stripY + zone.furnitureH / 2;
  ctx.save();
  // Seal: LEONIDA ★ EST. 2026, drawn in the furniture strip.
  ctx.beginPath();
  ctx.arc(W * 0.08, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#111111';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.strokeStyle = '#ffd166';
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.max(9, r * 0.28)}px Anton, sans-serif`;
  ctx.fillText('LEONIDA', W * 0.08, cy - r * 0.28);
  ctx.fillText('★ EST. 2026', W * 0.08, cy + r * 0.3);
  // Star strip.
  ctx.fillStyle = '#ffd166';
  ctx.font = `${Math.max(12, H * 0.02)}px sans-serif`;
  ctx.fillText('★ ★ ★ ★ ★', cx, cy - zone.furnitureH * 0.22);
  // Billing block.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `${Math.max(8, H * 0.011)}px sans-serif`;
  ctx.fillText('A LEONIDA PICTURE  •  STARRING THE DUO  •  OCEAN DRIVE  •  VICE CITY, FLORIDA', cx, cy + zone.furnitureH * 0.28);
  // Callouts + magazine issue line.
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(9, H * 0.013)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('ISSUE 01 — LEONIDA', W * 0.86, cy);
  ctx.restore();
}

// Main entry: draw the whole cover for the given state at W x H.
// Chips are drawn LAST so nothing can paint over a role tag.
export function drawCover(ctx, state, images, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, W, H);
  const zone = panelZone(state, W, H);
  const rects = layoutPanels(state.layout, zone);
  const chips = chipRect(state, W, H);
  state.panels.forEach((panel, i) => {
    const r = rects[i];
    if (!r) return;
    const img = images[panel.photo];
    ctx.save();
    if (r.slant) slantPath(ctx, r);
    else { ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.closePath(); }
    ctx.clip();
    if (img) drawPhotoCover(ctx, img, r, panel.crop || { x: 0.5, y: 0.5, zoom: 1 });
    else { ctx.fillStyle = '#22222e'; ctx.fillRect(r.x, r.y, r.w, r.h); }
    // Slanted slices are split: ghost top half, no chip up there.
    if (r.split) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(r.x, r.y, r.w, r.h / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(r.x, r.y + r.h / 2, r.w, 2);
    }
    ctx.restore();
    // Panel frame.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, W * 0.003);
    if (r.slant) slantPath(ctx, r); else { ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.closePath(); }
    ctx.stroke();
    ctx.restore();
  });
  // Magazine spine between hero and mini grid.
  if (state.layout === 'magazine') {
    const spineX = zone.x + zone.w * 0.56 + Math.max(2, zone.w * 0.003);
    ctx.save();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.beginPath();
    ctx.moveTo(spineX, zone.y);
    ctx.lineTo(spineX, zone.y + zone.h);
    ctx.stroke();
    ctx.restore();
  }
  drawGrade(ctx, state, W, H);
  drawTitle(ctx, state, W, H, zone);
  drawFurniture(ctx, state, W, H, zone);
  // Role chips LAST — nothing may paint over them.
  chips.forEach((chip) => {
    ctx.save();
    roundRectPath(ctx, chip.x, chip.y, chip.w, chip.h, chip.h / 2);
    ctx.fillStyle = 'rgba(10,10,16,0.88)';
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(1, chip.h * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${chip.h * 0.52}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(chip.label, chip.x + chip.w / 2, chip.y + chip.h / 2 + 1);
    ctx.restore();
  });
}

// Hit-test a point (canvas coords) against the role chips.
// Uses chipRect() — the single source of truth — never a second formula.
export function chipAt(state, W, H, px, py) {
  const chips = chipRect(state, W, H);
  for (const chip of chips) {
    if (px >= chip.x && px <= chip.x + chip.w && py >= chip.y && py <= chip.y + chip.h) {
      return chip;
    }
  }
  return null;
}

// Load every sample photo once; returns { name: HTMLImageElement }.
export function loadSampleImages() {
  const out = {};
  const jobs = PHOTO_NAMES.map((name) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { out[name] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = SAMPLE_FILES[name];
  }));
  return Promise.all(jobs).then(() => out);
}
