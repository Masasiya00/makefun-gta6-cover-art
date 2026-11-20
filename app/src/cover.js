// app/src/cover.js — VICE HEAT: Leonida Cover Studio
// Poster renderer. Pure canvas drawing, no network: every photo is a local
// file under app/samples/ or an image the user uploaded (never leaves the
// machine). No Rockstar logo, artwork, or font is used anywhere.
//
// GEOMETRY RULES (structural, keep them):
//  - The title owns its own horizontal band, 1.78x the title font size.
//  - Title font size is computed from the canvas width.
//  - Panels live ONLY in the zone outside the title band + furniture strip.
//  - The duo panel is 1.32x its nominal cell, clamped to its zone so it can
//    never bleed into a neighbouring panel.
//  - In the slanted layout each slice is split: the top part is a ghost
//    (faded, no chip), the bottom part carries the chip.
//  - Role chips are drawn LAST, on top of everything, so they are never cut.
//  - The seal sits in the furniture strip, radius 34.
//  - Hero layout is untouched: the title sits on top of the art.
//  - Magazine layout + title position "Middle" deliberately fall back to the
//    top band (a magazine masthead belongs on top; a middle title would
//    collide with the hero duo).

export const PHOTOS = [
  { id: 'duo', file: 'samples/duo.jpg', role: 'THE DUO' },
  { id: 'beach', file: 'samples/beach.jpg', role: 'VICE BEACH' },
  { id: 'skyline', file: 'samples/skyline.jpg', role: 'VICE CITY' },
  { id: 'car', file: 'samples/car.jpg', role: 'GETAWAY DRIVER' },
  { id: 'heli', file: 'samples/heli.jpg', role: 'AIR SUPPORT' },
  { id: 'pool', file: 'samples/pool.jpg', role: 'POOLSIDE' },
  { id: 'boulevard', file: 'samples/boulevard.jpg', role: 'BOULEVARD' },
  { id: 'pier', file: 'samples/pier.jpg', role: 'THE PIER' },
  { id: 'gator', file: 'samples/gator.jpg', role: 'LEONIDA WILD' },
];

export const GRADES = [
  { id: 'sunset', name: 'Sunset', title: 'VICE HEAT', tint: '#ff7a1a', strength: 0.42 },
  { id: 'neon', name: 'Neon Night', title: 'NEON VICE', tint: '#ff2fb3', strength: 0.45 },
  { id: 'twilight', name: 'Twilight Gold', title: 'GOLDEN HOUR', tint: '#e8a33d', strength: 0.40 },
  { id: 'coral', name: 'Coral Heat', title: 'CORAL HEAT', tint: '#ff6f61', strength: 0.42 },
  { id: 'violet', name: 'Vice Violet', title: 'VICE VIOLET', tint: '#8b5cf6', strength: 0.45 },
  { id: 'mono', name: 'Mono Noir', title: 'MONO NOIR', tint: '#808080', strength: 0.85, mono: true },
  { id: 'ocean', name: 'Ocean Drive', title: 'OCEAN DRIVE', tint: '#0ea5b7', strength: 0.45 },
  { id: 'bubblegum', name: 'Bubblegum', title: 'BUBBLEGUM', tint: '#ff8fd1', strength: 0.42 },
];

export const GRADE_TITLES = GRADES.map((g) => g.title);
export const LAYOUTS = ['grid', 'slanted', 'quad', 'hero', 'magazine'];
export const EXPORT_SIZES = [
  [1080, 1080],
  [1080, 1350],
  [1920, 1080],
  [1080, 1920],
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function freshState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    intensity: 85,
    title: 'VICE HEAT',
    subtitle: 'LEONIDA',
    tagline: 'WELCOME TO LEONIDA',
    quote: 'One last score. One way out.',
    titlePos: 'top', // 'top' | 'middle' | 'bottom'
    outline: true,
    outlineWidth: 6,
    shadow: 14,
    order: PHOTOS.map((p) => p.id), // slot i shows photo order[i]
    roles: Object.fromEntries(PHOTOS.map((p) => [p.id, p.role])),
    crops: {}, // slot index -> { scale, ox, oy }
    uploads: {}, // slot index -> dataURL (session only, never uploaded)
  };
}

export function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

// --- measuring -------------------------------------------------------------
const measureCtx = (() => {
  if (typeof document === 'undefined') return null;
  return document.createElement('canvas').getContext('2d');
})();

function fitTitleSize(W, H, title) {
  let size = Math.min(W * 0.1, H * 0.17);
  if (measureCtx && title) {
    measureCtx.font = `${size}px Anton, sans-serif`;
    const w = measureCtx.measureText(title.toUpperCase()).width;
    const maxW = W * 0.94;
    if (w > maxW) size *= maxW / w;
  }
  return Math.max(18, size);
}

// --- geometry --------------------------------------------------------------
export function geometry(W, H, state) {
  const margin = Math.round(W * 0.03);
  const furnitureH = Math.round(H * 0.1);
  const titleSize = fitTitleSize(W, H, state.title);
  const bandH = titleSize * 1.78; // the title band is 1.78x the title font size
  const hero = state.layout === 'hero';
  // Magazine + "Middle" title position deliberately fall back to the top band.
  const titlePos =
    state.layout === 'magazine' || state.titlePos === 'middle' ? 'top' : state.titlePos;
  const gap = Math.max(6, Math.round(W * 0.008));
  let zone;
  if (hero) {
    zone = { x: margin, y: margin, w: W - margin * 2, h: H - furnitureH - margin };
  } else if (titlePos === 'bottom') {
    zone = { x: margin, y: margin, w: W - margin * 2, h: H - furnitureH - bandH - margin };
  } else {
    zone = {
      x: margin,
      y: bandH + margin * 0.5,
      w: W - margin * 2,
      h: H - furnitureH - bandH - margin * 0.5,
    };
  }
  return { margin, furnitureH, titleSize, bandH, titlePos, gap, zone, hero };
}

function rectsGrid(zone, gap) {
  // 3x3 grid. The centre cell (the duo) is 1.32x its nominal cell; the
  // eight neighbours shrink to make room, so nothing ever overlaps.
  // The enlarged duo cell is clamped to its zone.
  const cols = 3;
  const rows = 3;
  const cw = (zone.w - gap * (cols - 1)) / cols;
  const rh = (zone.h - gap * (rows - 1)) / rows;
  let ccw = Math.min(cw * 1.32, zone.w * 0.62);
  let crh = Math.min(rh * 1.32, zone.h * 0.62);
  const sideW = (zone.w - ccw - gap * 2) / 2;
  const sideH = (zone.h - crh - gap * 2) / 2;
  const xs = [zone.x, zone.x + sideW + gap, zone.x + sideW + gap + ccw + gap];
  const ws = [sideW, ccw, sideW];
  const ys = [zone.y, zone.y + sideH + gap, zone.y + sideH + gap + crh + gap];
  const hs = [sideH, crh, sideH];
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push({ x: xs[c], y: ys[r], w: ws[c], h: hs[r] });
    }
  }
  // Row-major cells, but the centre cell (index 4) always shows order[0]
  // (the duo). The other eight cells show order[1..8].
  const orderIndex = [1, 2, 3, 4, 0, 5, 6, 7, 8];
  return cells.map((rect, i) => ({ slot: orderIndex[i], rect, kind: 'rect' }));
}

function rectsSlanted(zone, gap) {
  // Five diagonal slices. Each slice is a parallelogram; adjacent slices
  // share an edge. The top ~42% of every slice is a "ghost" (faded, no
  // chip); the bottom ~58% is full-strength and carries the chip.
  const n = 5;
  const slant = zone.h * 0.14;
  const sw = zone.w / n;
  const out = [];
  for (let i = 0; i < n; i++) {
    const x0 = zone.x + i * sw;
    const x1 = zone.x + (i + 1) * sw;
    const poly = [
      { x: x0 + slant, y: zone.y },
      { x: x1 + slant, y: zone.y },
      { x: x1, y: zone.y + zone.h },
      { x: x0, y: zone.y + zone.h },
    ];
    out.push({
      slot: i,
      kind: 'poly',
      poly,
      rect: { x: x0, y: zone.y, w: sw + slant, h: zone.h },
      ghostSplit: 0.42,
    });
  }
  return out;
}

function rectsQuad(zone, gap) {
  const w = (zone.w - gap) / 2;
  const h = (zone.h - gap) / 2;
  return [
    { slot: 0, kind: 'rect', rect: { x: zone.x, y: zone.y, w, h } },
    { slot: 1, kind: 'rect', rect: { x: zone.x + w + gap, y: zone.y, w, h } },
    { slot: 2, kind: 'rect', rect: { x: zone.x, y: zone.y + h + gap, w, h } },
    { slot: 3, kind: 'rect', rect: { x: zone.x + w + gap, y: zone.y + h + gap, w, h } },
  ];
}

function rectsMagazine(zone, gap, W) {
  // Left: hero duo. Spine: thin vertical bar with rotated issue text.
  // Right: mini 2x2 grid. Masthead lives in the title band above.
  const spineW = Math.max(16, Math.round(W * 0.02));
  const leftW = zone.w * 0.56;
  const rightX = zone.x + leftW + spineW + gap;
  const rightW = zone.x + zone.w - rightX;
  const gw = (rightW - gap) / 2;
  const gh = (zone.h - gap) / 2;
  return [
    { slot: 0, kind: 'rect', rect: { x: zone.x, y: zone.y, w: leftW, h: zone.h }, hero: true },
    { slot: 1, kind: 'rect', rect: { x: rightX, y: zone.y, w: gw, h: gh } },
    { slot: 2, kind: 'rect', rect: { x: rightX + gw + gap, y: zone.y, w: gw, h: gh } },
    { slot: 3, kind: 'rect', rect: { x: rightX, y: zone.y + gh + gap, w: gw, h: gh } },
    { slot: 4, kind: 'rect', rect: { x: rightX + gw + gap, y: zone.y + gh + gap, w: gw, h: gh } },
    { slot: 'spine', kind: 'spine', rect: { x: zone.x + leftW + gap * 0.5, y: zone.y, w: spineW, h: zone.h } },
  ];
}

// Placements for the current layout. Each entry: { slot, kind, rect, poly?,
// ghostSplit?, hero? }. slot indexes into state.order (spine has no photo).
export function layoutPanels(state, W, H) {
  const geo = geometry(W, H, state);
  const { zone, gap } = geo;
  if (state.layout === 'slanted') return { geo, panels: rectsSlanted(zone, gap) };
  if (state.layout === 'quad') return { geo, panels: rectsQuad(zone, gap) };
  if (state.layout === 'hero') {
    return { geo, panels: [{ slot: 0, kind: 'rect', rect: { x: 0, y: 0, w: W, h: H }, full: true }] };
  }
  if (state.layout === 'magazine') return { geo, panels: rectsMagazine(zone, gap, W) };
  return { geo, panels: rectsGrid(zone, gap) };
}

// --- photo drawing ---------------------------------------------------------
export function clampCrop(rect, imgW, imgH, crop) {
  const c = { scale: crop?.scale || 1, ox: crop?.ox || 0, oy: crop?.oy || 0 };
  c.scale = Math.max(1, Math.min(3, c.scale));
  const base = Math.max(rect.w / imgW, rect.h / imgH);
  const s = base * c.scale;
  const maxOx = Math.max(0, (imgW * s - rect.w) / 2);
  const maxOy = Math.max(0, (imgH * s - rect.h) / 2);
  c.ox = Math.max(-maxOx, Math.min(maxOx, c.ox));
  c.oy = Math.max(-maxOy, Math.min(maxOy, c.oy));
  return c;
}

function drawPhotoIn(ctx, img, rect, crop) {
  const c = clampCrop(rect, img.naturalWidth, img.naturalHeight, crop);
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const s = base * c.scale;
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  let dx = rect.x + (rect.w - dw) / 2 + c.ox;
  let dy = rect.y + (rect.h - dh) / 2 + c.oy;
  if (dw > rect.w) dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  else dx = rect.x + (rect.w - dw) / 2;
  if (dh > rect.h) dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  else dy = rect.y + (rect.h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function applyGrade(ctx, grade, intensity, rect) {
  const a = Math.max(0, Math.min(100, intensity)) / 100;
  if (a <= 0) return;
  ctx.save();
  if (grade.mono) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = a;
    ctx.fillStyle = '#808080';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a * 0.18;
    ctx.fillStyle = '#000000';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    ctx.globalAlpha = a * grade.strength;
    ctx.fillStyle = grade.tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

function pathPoly(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
}

function chipRect(ctx, text, x, y, W) {
  const fs = Math.max(11, Math.round(W * 0.015));
  ctx.font = `${fs}px Anton, sans-serif`;
  const tw = ctx.measureText(text.toUpperCase()).width;
  const padX = fs * 0.7;
  const h = fs * 1.9;
  return { x, y: y - h, w: tw + padX * 2, h, fs };
}

function drawChip(ctx, text, rect, W) {
  const c = chipRect(ctx, text, rect.x, rect.y, W);
  ctx.save();
  ctx.fillStyle = 'rgba(8, 8, 12, 0.88)';
  roundRect(ctx, c.x, c.y, c.w, c.h, c.h / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${c.fs}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), c.x + c.fs * 0.7, c.y + c.h / 2 + 1);
  ctx.restore();
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- furniture -------------------------------------------------------------
function drawSeal(ctx, cx, cy, W) {
  const r = 34; // the seal lives in the furniture strip, radius 34
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#101018';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d8a24a';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(216, 162, 74, 0.7)';
  ctx.stroke();
  ctx.fillStyle = '#f5d9a0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(W * 0.011) + 6}px Anton, sans-serif`;
  ctx.fillText('LEONIDA', cx, cy - 11);
  ctx.font = `${Math.round(W * 0.014) + 6}px sans-serif`;
  ctx.fillText('★', cx, cy + 3);
  ctx.font = `${Math.round(W * 0.008) + 5}px Anton, sans-serif`;
  ctx.fillText('EST. 2026', cx, cy + 15);
  ctx.restore();
}

function drawFurniture(ctx, state, W, H, geo) {
  const { furnitureH, margin } = geo;
  const y0 = H - furnitureH;
  ctx.save();
  ctx.fillStyle = geo.hero ? 'rgba(8, 8, 12, 0.82)' : '#0d0d12';
  ctx.fillRect(0, y0, W, furnitureH);
  ctx.fillStyle = 'rgba(216, 162, 74, 0.55)';
  ctx.fillRect(0, y0, W, 2);
  // Quote bar: one line, centred near the top of the strip.
  ctx.fillStyle = '#f2ead8';
  ctx.font = `italic ${Math.max(13, Math.round(H * 0.016))}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`“${state.quote}”`, W / 2, y0 + furnitureH * 0.26);
  // Billing block, bottom-left (film-poster style small credits).
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `${Math.max(8, Math.round(H * 0.009))}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('LEONIDA PICTURES PRESENTS  •  A VICE HEAT PRODUCTION', margin, y0 + furnitureH * 0.58);
  ctx.fillText('STARRING THE DUO  •  MUSIC BY THE NEON PALMS  •  © 2026 LEONIDA', margin, y0 + furnitureH * 0.78);
  // Star strip, centred at the bottom of the strip.
  ctx.fillStyle = '#ffd166';
  ctx.font = `${Math.max(11, Math.round(H * 0.013))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('★ ★ ★ ★ ★', W / 2, y0 + furnitureH * 0.8);
  // Seal, right side of the strip.
  drawSeal(ctx, W - margin - 34, y0 + furnitureH / 2, W);
  ctx.restore();
}

function drawCallout(ctx, W, H, geo) {
  // Small tag pinned to the top-right corner of the panel zone.
  const text = 'LEONIDA • 2026';
  const fs = Math.max(10, Math.round(W * 0.013));
  ctx.save();
  ctx.font = `${fs}px Anton, sans-serif`;
  const tw = ctx.measureText(text).width;
  const pad = fs * 0.8;
  const w = tw + pad * 2;
  const h = fs * 2;
  const x = geo.zone.x + geo.zone.w - w;
  const y = geo.zone.y;
  ctx.fillStyle = 'rgba(8, 8, 12, 0.85)';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = '#d8a24a';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#f5d9a0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

// --- title -----------------------------------------------------------------
function drawTitle(ctx, state, W, H, geo) {
  const { titleSize, bandH, titlePos } = geo;
  let cy;
  if (geo.hero) {
    // Hero layout is untouched: the title sits on top of the art.
    cy = titlePos === 'bottom' ? H - geo.furnitureH - bandH / 2 : titlePos === 'middle' ? H / 2 : bandH / 2;
  } else {
    cy = titlePos === 'bottom' ? H - geo.furnitureH - bandH / 2 : bandH / 2;
  }
  const title = (state.title || 'VICE HEAT').toUpperCase();
  // Magazine carries one extra line (ISSUE 01) inside the same band, so the
  // whole title block is shifted up a little to keep every line inside the
  // 1.78x band instead of spilling over the panels below.
  const cy0 = cy - (state.layout === 'magazine' ? titleSize * 0.12 : 0);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (state.shadow > 0) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = state.shadow;
    ctx.shadowOffsetY = Math.round(state.shadow * 0.35);
  }
  ctx.font = `${titleSize}px Anton, sans-serif`;
  const grad = ctx.createLinearGradient(0, cy0 - titleSize / 2, 0, cy0 + titleSize / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#ffe9c4');
  if (state.outline) {
    ctx.lineWidth = Math.max(1, state.outlineWidth);
    ctx.strokeStyle = '#0d0d12';
    ctx.lineJoin = 'round';
    ctx.strokeText(title, W / 2, cy0 - titleSize * 0.08);
  }
  ctx.fillStyle = grad;
  ctx.fillText(title, W / 2, cy0 - titleSize * 0.08);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // Subtitle + tagline stacked inside the same band.
  const subSize = Math.max(11, titleSize * 0.2);
  ctx.font = `${subSize}px Anton, sans-serif`;
  ctx.fillStyle = '#f5d9a0';
  const sub = (state.subtitle || 'LEONIDA').toUpperCase().split('').join(' ');
  ctx.fillText(sub, W / 2, cy0 + titleSize * 0.46);
  const tagSize = Math.max(9, titleSize * 0.14);
  ctx.font = `${tagSize}px sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText((state.tagline || '').toUpperCase(), W / 2, cy0 + titleSize * 0.46 + subSize + tagSize * 0.5);
  if (state.layout === 'magazine') {
    ctx.font = `${tagSize}px Anton, sans-serif`;
    ctx.fillStyle = '#d8a24a';
    ctx.fillText('ISSUE 01 — LEONIDA', W / 2, cy0 + titleSize * 0.46 + subSize + tagSize * 1.7);
  }
  ctx.restore();
  return cy;
}

// --- main render -----------------------------------------------------------
export function renderCover(ctx, state, images, uploadImages, W, H) {
  const { geo, panels } = layoutPanels(state, W, H);
  const grade = gradeById(state.grade);
  ctx.clearRect(0, 0, W, H);
  // Backdrop.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#17171f');
  bg.addColorStop(1, '#0b0b10');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Title band backdrop (not for hero: the title sits on the art there).
  if (!geo.hero) {
    const bandY = geo.titlePos === 'bottom' ? H - geo.furnitureH - geo.bandH : 0;
    const tg = ctx.createLinearGradient(0, bandY, 0, bandY + geo.bandH);
    tg.addColorStop(0, '#1b1b26');
    tg.addColorStop(1, '#0b0b10');
    ctx.fillStyle = tg;
    ctx.fillRect(0, bandY, W, geo.bandH);
    ctx.fillStyle = 'rgba(216, 162, 74, 0.55)';
    const ruleY = geo.titlePos === 'bottom' ? bandY : bandY + geo.bandH;
    ctx.fillRect(0, ruleY - 1, W, 2);
  }

  const chips = []; // chips are collected here and drawn LAST, on top of all.
  const imgFor = (slot) => {
    if (uploadImages && uploadImages[slot]) return uploadImages[slot];
    const id = state.order[slot];
    return images ? images[id] : null;
  };

  for (const p of panels) {
    if (p.kind === 'spine') {
      ctx.save();
      ctx.fillStyle = '#14141c';
      ctx.fillRect(p.rect.x, p.rect.y, p.rect.w, p.rect.h);
      ctx.fillStyle = '#d8a24a';
      ctx.fillRect(p.rect.x, p.rect.y, 2, p.rect.h);
      ctx.fillRect(p.rect.x + p.rect.w - 2, p.rect.y, 2, p.rect.h);
      ctx.translate(p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#f5d9a0';
      ctx.font = `${Math.max(9, Math.round(W * 0.011))}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VICE HEAT  •  ISSUE 01  •  LEONIDA', 0, 0);
      ctx.restore();
      continue;
    }
    const img = imgFor(p.slot);
    const crop = state.crops[p.slot] || { scale: 1, ox: 0, oy: 0 };
    ctx.save();
    if (p.kind === 'poly') pathPoly(ctx, p.poly);
    else ctx.beginPath(), ctx.rect(p.rect.x, p.rect.y, p.rect.w, p.rect.h);
    ctx.clip();
    if (img) {
      drawPhotoIn(ctx, img, p.rect, crop);
      if (p.ghostSplit) {
        // Slanted slice split: the top part is a ghost (faded, no chip).
        const splitY = p.rect.y + p.rect.h * p.ghostSplit;
        ctx.save();
        ctx.beginPath();
        ctx.rect(p.rect.x - 200, p.rect.y - 200, p.rect.w + 400, splitY - p.rect.y + 200);
        ctx.clip();
        ctx.globalCompositeOperation = 'saturation';
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#808080';
        ctx.fillRect(p.rect.x, p.rect.y, p.rect.w, p.rect.h);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.34;
        ctx.fillStyle = '#e8e8f0';
        ctx.fillRect(p.rect.x, p.rect.y, p.rect.w, splitY - p.rect.y);
        ctx.restore();
        // Grade applies to the bottom (live) part of the slice only.
        ctx.save();
        ctx.beginPath();
        ctx.rect(p.rect.x - 200, splitY, p.rect.w + 400, p.rect.h);
        ctx.clip();
        applyGrade(ctx, grade, state.intensity, p.rect);
        ctx.restore();
      } else {
        applyGrade(ctx, grade, state.intensity, p.rect);
      }
    } else {
      ctx.fillStyle = '#23232e';
      ctx.fillRect(p.rect.x, p.rect.y, p.rect.w, p.rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `${Math.max(11, Math.round(W * 0.014))}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((state.order[p.slot] || '?').toUpperCase(), p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h / 2);
    }
    ctx.restore();
    // Panel edge.
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    if (p.kind === 'poly') pathPoly(ctx, p.poly);
    else ctx.beginPath(), ctx.rect(p.rect.x, p.rect.y, p.rect.w, p.rect.h);
    ctx.stroke();
    ctx.restore();
    // Collect the chip; it is drawn after everything else.
    if (!p.full) {
      const id = state.order[p.slot];
      const role = state.roles[id] || id || '';
      const chipY = p.ghostSplit
        ? p.rect.y + p.rect.h - Math.max(8, Math.round(W * 0.008))
        : p.rect.y + p.rect.h - Math.max(8, Math.round(W * 0.008));
      chips.push({ text: role, x: p.rect.x + Math.max(8, Math.round(W * 0.008)), y: chipY, slot: p.slot, photoId: id });
    }
  }

  drawTitle(ctx, state, W, H, geo);
  drawFurniture(ctx, state, W, H, geo);
  if (!geo.hero) drawCallout(ctx, W, H, geo);
  // Chips LAST, on top of everything, so they are never cut off.
  const drawnChips = [];
  for (const c of chips) {
    const r = drawChip(ctx, c.text, { x: c.x, y: c.y }, W);
    drawnChips.push({ ...c, rect: r });
  }
  return { geo, chips: drawnChips };
}

// Hit-test a canvas point. Returns { slot, photoId, chip } or null.
export function hitTest(state, W, H, x, y) {
  const { panels } = layoutPanels(state, W, H);
  for (const p of panels) {
    if (p.kind === 'spine') continue;
    let inside = false;
    if (p.kind === 'poly') {
      inside = pointInPoly(x, y, p.poly);
    } else {
      inside =
        x >= p.rect.x && x <= p.rect.x + p.rect.w && y >= p.rect.y && y <= p.rect.y + p.rect.h;
    }
    if (inside) return { slot: p.slot, photoId: state.order[p.slot], chip: false };
  }
  return null;
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function shuffleState(state) {
  const ids = [...state.order];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  state.order = ids;
  const g = GRADES[Math.floor(Math.random() * GRADES.length)];
  state.grade = g.id;
  state.title = g.title;
  return state;
}
