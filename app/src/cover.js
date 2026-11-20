// VICE HEAT: Leonida Cover Studio — cover renderer (app/src/cover.js).
//
// Pure canvas drawing: no DOM access here, so the same code draws the live
// preview, the ?shot= scenes and the exported PNGs at any size. A cover is
// built from a state object (see defaultState): a layout of photo panels, a
// colour grade, a title band of its own, and a furniture strip at the foot.
// Nothing here loads over the network and nothing here names Rockstar, its
// logos, its artwork or its fonts: the only font is Anton (OFL, vendored
// under app/fonts) and every photo is a local sample or the user's own file.

export const SAMPLE_PHOTOS = [
  { key: 'duo', role: 'DUO', label: 'Leonida duo' },
  { key: 'beach', role: 'SURFER', label: 'Beach surfer' },
  { key: 'skyline', role: 'OCEAN DR', label: 'Ocean Drive skyline' },
  { key: 'car', role: 'DRIVER', label: 'Getaway driver' },
  { key: 'heli', role: 'RESCUE', label: 'Heli rescue' },
  { key: 'pool', role: 'POOLSIDE', label: 'Poolside swimmer' },
  { key: 'gator', role: 'GATOR', label: 'Gator man' },
  { key: 'boulevard', role: 'BLVD', label: 'Boulevard' },
  { key: 'pier', role: 'PIER', label: 'Pier' },
];

// The eight colour grades. `filter` is the full-strength CSS filter recipe
// for the grade (the uniform pre-grade is applied on top of it in
// photoFilter, below); `wash` is a linear gradient laid over each photo
// with 'overlay' blending, scaled by the intensity slider; `title` is the
// three-stop gradient the big title is painted with.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: { saturate: 1.35, contrast: 1.1, brightness: 1.04, sepia: 0.18, hue: -8 },
    wash: ['#ff9a3d', '#ff2d78', '#7b2ff7'],
    title: ['#ffe259', '#ff7e3d', '#ff2d78'],
  },
  neon: {
    label: 'Neon Night',
    filter: { saturate: 1.7, contrast: 1.15, brightness: 1.0, sepia: 0.0, hue: 12 },
    wash: ['#ff2bd6', '#7b2ff7', '#00e5ff'],
    title: ['#8afff3', '#00e5ff', '#ff2bd6'],
  },
  twilight: {
    label: 'Twilight Gold',
    filter: { saturate: 1.25, contrast: 1.08, brightness: 1.02, sepia: 0.28, hue: -4 },
    wash: ['#ffb347', '#e58e3d', '#b06ab3'],
    title: ['#fff3b0', '#ffcf5c', '#e58e3d'],
  },
  coral: {
    label: 'Coral Heat',
    filter: { saturate: 1.5, contrast: 1.08, brightness: 1.03, sepia: 0.1, hue: -18 },
    wash: ['#ff7e5f', '#feb47b', '#ff5e78'],
    title: ['#ffd9a0', '#ff7e5f', '#ff3d68'],
  },
  violet: {
    label: 'Vice Violet',
    filter: { saturate: 1.4, contrast: 1.12, brightness: 1.0, sepia: 0.05, hue: 28 },
    wash: ['#8e2de2', '#4a00e0', '#ff2d78'],
    title: ['#e6ccff', '#b678ff', '#7b2ff7'],
  },
  mono: {
    label: 'Mono Noir',
    filter: { saturate: 0.0, contrast: 1.25, brightness: 1.05, sepia: 0.0, hue: 0 },
    wash: ['#888888', '#444444', '#111111'],
    title: ['#ffffff', '#d8d8d8', '#9a9a9a'],
  },
  ocean: {
    label: 'Ocean Drive',
    // A small hue shift plus a teal wash: a big hue-rotate turns every warm
    // sunset photo green, which reads as a mistake, not a grade.
    filter: { saturate: 1.45, contrast: 1.1, brightness: 1.03, sepia: 0.0, hue: 35 },
    wash: ['#00c9a7', '#005bea', '#00e5ff'],
    title: ['#c8fff4', '#4de8c2', '#0090ff'],
  },
  bubblegum: {
    label: 'Bubblegum',
    filter: { saturate: 1.6, contrast: 1.05, brightness: 1.08, sepia: 0.0, hue: 10 },
    wash: ['#ff9de2', '#ff6b9d', '#ffd1ec'],
    title: ['#ffffff', '#ffb3dd', '#ff5ea8'],
  },
};

export const GRADE_KEYS = Object.keys(GRADES);

export const LAYOUTS = {
  grid: { label: '9-Panel Grid' },
  slanted: { label: 'Slanted' },
  four: { label: '4-Panel' },
  single: { label: 'Single Hero' },
  magazine: { label: 'Magazine Spread' },
};

export const LAYOUT_KEYS = Object.keys(LAYOUTS);

export const TITLES = ['VICE HEAT', 'NEON VICE', 'GOLDEN HOUR', 'LEONIDA NIGHTS', 'OCEAN HEIST'];

// One panel: a photo (an HTMLImageElement once loaded, or null for the
// empty state), a crop focal point (cx, cy in 0..1, clamped by definition)
// and a zoom (1 = cover-fit). The role tag is editable text.
export function blankPanel(photoKey) {
  const found = SAMPLE_PHOTOS.find((p) => p.key === photoKey);
  return { photo: photoKey, img: null, role: found ? found.role : 'PANEL', zoom: 1, cx: 0.5, cy: 0.5 };
}

export function defaultState() {
  const order = ['skyline', 'beach', 'car', 'pool', 'duo', 'heli', 'gator', 'boulevard', 'pier'];
  return {
    layout: 'grid',
    grade: 'sunset',
    intensity: 85,
    title: 'VICE HEAT',
    subtitle: 'LEONIDA',
    tagline: 'Two outlaws. One last score.',
    quote: '"Welcome back to Leonida."',
    titlePos: 'top',
    outline: true,
    outlineWidth: 6,
    shadow: 14,
    panels: order.map((key) => blankPanel(key)),
  };
}

// Uniform pre-grade, applied to every photo before the grade itself: a
// saturate lift, a contrast lift and a warm red lift, so all nine samples
// share one look whatever grade sits on top of them.
export function photoFilter(gradeKey, intensity) {
  const t = Math.max(0, Math.min(100, intensity)) / 100;
  const g = GRADES[gradeKey] ?? GRADES.sunset;
  const lerp = (from, to) => from + (to - from) * t;
  const saturate = 1.28 * lerp(1, g.filter.saturate);
  const contrast = 1.12 * lerp(1, g.filter.contrast);
  const brightness = lerp(1, g.filter.brightness);
  const sepia = lerp(0, g.filter.sepia);
  const hue = Math.round(lerp(0, g.filter.hue));
  return `saturate(${saturate.toFixed(3)}) contrast(${contrast.toFixed(3)}) brightness(${brightness.toFixed(3)}) sepia(${sepia.toFixed(3)}) hue-rotate(${hue}deg)`;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// Geometry of the poster: the title owns a horizontal band of its own,
// 1.78x the title size tall, and the furniture strip owns the foot. Panels
// live only in the zones outside both, so the title never sits on a photo.
// Magazine with titlePos 'middle' falls back to the top band: a centred
// band would cut the magazine's hero and mini-grid in half, and the
// magazine's masthead belongs at the top by design.
export function layoutZones(W, H, titlePos, titleSize, layout) {
  const bandH = Math.round(1.78 * titleSize);
  const furnH = Math.max(64, Math.round(H * 0.075));
  // The quote bar rides on the seam above the furniture strip, so the panel
  // zones end above it too — otherwise it would sit on the bottom row.
  const quoteH = Math.max(30, Math.round(H * 0.032));
  let pos = titlePos;
  if (layout === 'magazine' && pos === 'middle') pos = 'top';
  let bandY;
  if (pos === 'bottom') bandY = H - furnH - quoteH - bandH;
  else if (pos === 'middle') bandY = Math.round((H - furnH - quoteH - bandH) / 2);
  else bandY = 0;
  const band = { x: 0, y: bandY, w: W, h: bandH };
  const furniture = { x: 0, y: H - furnH, w: W, h: furnH };
  const zoneBottom = H - furnH - quoteH;
  const zones = [];
  if (bandY > 0) zones.push({ x: 0, y: 0, w: W, h: bandY });
  const belowTop = bandY + bandH;
  const belowH = zoneBottom - belowTop;
  if (belowH > 0) zones.push({ x: 0, y: belowTop, w: W, h: belowH });
  return { band, furniture, zones, bandH, furnH, quoteH, pos };
}

function gapFor(W) {
  return Math.max(4, Math.round(W * 0.006));
}

// Split a zone list into rows for a grid: rows are handed to zones in
// proportion to their heights, so a middle title band leaves one row above
// it and two below, never a row under the band.
function rowsAcrossZones(zones, rows) {
  const total = zones.reduce((sum, z) => sum + z.h, 0);
  const out = [];
  let handed = 0;
  zones.forEach((zone, i) => {
    const last = i === zones.length - 1;
    const count = last ? rows - handed : Math.max(zone.h > 40 ? 1 : 0, Math.round((rows * zone.h) / total));
    handed += count;
    for (let r = 0; r < count; r++) out.push({ zone, row: r, rows: count });
  });
  return out;
}

function drawPhotoInto(ctx, img, rect, crop, gradeKey, intensity, ghost) {
  if (!img || !img.naturalWidth) return false;
  const { w: pw, h: ph } = rect;
  const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
  const scale = base * Math.max(1, crop.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  // Pan is a focal point, so it clamps itself: cx/cy in 0..1 can never
  // expose empty canvas past the photo's edge.
  const ox = rect.x + (pw - dw) * clamp01(crop.cx ?? 0.5);
  const oy = rect.y + (ph - dh) * clamp01(crop.cy ?? 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, pw, ph);
  ctx.clip();
  ctx.filter = ghost ? 'saturate(0.35) contrast(1.05) brightness(1.12)' : photoFilter(gradeKey, intensity);
  ctx.globalAlpha = ghost ? 0.45 : 1;
  ctx.drawImage(img, ox, oy, dw, dh);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  if (!ghost) {
    // Warm red lift, part of the uniform pre-grade.
    ctx.fillStyle = 'rgba(255, 64, 32, 0.06)';
    ctx.fillRect(rect.x, rect.y, pw, ph);
    // Grade wash, scaled by the intensity slider.
    const t = Math.max(0, Math.min(100, intensity)) / 100;
    if (t > 0) {
      const g = GRADES[gradeKey] ?? GRADES.sunset;
      const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + pw, rect.y + ph);
      grad.addColorStop(0, g.wash[0]);
      grad.addColorStop(0.55, g.wash[1]);
      grad.addColorStop(1, g.wash[2]);
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.5 * t;
      ctx.fillStyle = grad;
      ctx.fillRect(rect.x, rect.y, pw, ph);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    // Gentle vignette so panels read as one poster.
    const vg = ctx.createRadialGradient(
      rect.x + pw / 2, rect.y + ph / 2, Math.min(pw, ph) * 0.35,
      rect.x + pw / 2, rect.y + ph / 2, Math.max(pw, ph) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(rect.x, rect.y, pw, ph);
  }
  ctx.restore();
  return true;
}

function drawEmptyPanel(ctx, rect, label) {
  ctx.save();
  ctx.fillStyle = '#1a1024';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 ${Math.max(11, Math.round(rect.w * 0.05))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label || 'ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

// Role chips are collected while panels draw and painted dead last, after
// every panel, so no panel, slice or title can ever cover one.
function chipJob(rect, role, W) {
  return { rect, role, W };
}

function drawChip(ctx, job) {
  const { rect, role } = job;
  // Capped: on a full-bleed hero the panel's short side is ~1000px, and an
  // uncapped 9% chip would be a billboard, not a tag.
  const fs = Math.max(11, Math.min(34, Math.round(Math.min(rect.w, rect.h) * 0.09)));
  ctx.save();
  ctx.font = `700 ${fs}px Anton, "Arial Black", sans-serif`;
  const tw = ctx.measureText(role).width;
  const padX = fs * 0.7;
  const bw = tw + padX * 2;
  const bh = fs * 1.9;
  // Clamped inside the canvas: slanted slices start off-canvas to the left,
  // and their chips must not follow them out.
  const bx = Math.max(8, Math.min(rect.x + Math.max(6, rect.w * 0.04), job.W - bw - 8));
  const by = rect.y + rect.h - bh - Math.max(6, rect.h * 0.05);
  ctx.fillStyle = 'rgba(12, 6, 20, 0.88)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = Math.max(1, fs * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(role, bx + padX, by + bh / 2 + fs * 0.04);
  ctx.restore();
}

function drawCallout(ctx, rect, text, angle, W) {
  const fs = Math.max(12, Math.round(Math.min(rect.w, rect.h) * 0.085));
  ctx.save();
  ctx.font = `700 ${fs}px Anton, "Arial Black", sans-serif`;
  const tw = ctx.measureText(text).width;
  // Clamped inside the canvas: a callout on the last cell would otherwise
  // hang half off the poster's right edge.
  const cx = Math.max(tw / 2 + 14, Math.min(rect.x + rect.w - 8, W - tw / 2 - 14));
  ctx.translate(cx, rect.y + 10);
  ctx.rotate(angle);
  ctx.fillStyle = '#ff2d78';
  ctx.fillRect(-tw / 2 - 10, -fs * 0.95, tw + 20, fs * 1.9);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, fs * 0.02);
  ctx.restore();
}

function gridPanels(zones, W) {
  const gap = gapFor(W);
  const rows = rowsAcrossZones(zones, 3);
  const cells = [];
  rows.forEach(({ zone, row, rows: rowsInZone }) => {
    const cw = (zone.w - gap * 2) / 3;
    const ch = (zone.h - gap * (rowsInZone - 1)) / rowsInZone;
    for (let c = 0; c < 3; c++) {
      cells.push({
        x: zone.x + c * (cw + gap),
        y: zone.y + row * (ch + gap),
        w: cw,
        h: ch,
        rowIndex: cells.length < 3 ? 0 : cells.length < 6 ? 1 : 2,
        col: c,
      });
    }
  });
  // The centre cell is the duo, 1.32x its cell, clamped to its own zone so
  // it can overlap its neighbours (the GTA layered look) but never the
  // title band or the furniture strip.
  const duo = cells[4];
  if (duo) {
    const hostZone = zones.find((z) => duo.y >= z.y && duo.y < z.y + z.h) ?? zones[0];
    const dw = duo.w * 1.32;
    const dh = duo.h * 1.32;
    const cx = duo.x + duo.w / 2;
    const cy = duo.y + duo.h / 2;
    const nx = Math.max(hostZone.x, Math.min(cx - dw / 2, hostZone.x + hostZone.w - dw));
    const ny = Math.max(hostZone.y, Math.min(cy - dh / 2, hostZone.y + hostZone.h - dh));
    duo.x = nx;
    duo.y = ny;
    duo.w = dw;
    duo.h = dh;
    duo.duo = true;
  }
  return cells.slice(0, 9);
}

function slantedPanels(zones, W) {
  // Four diagonal slices. A slice cut by the title band is split: the part
  // above the band is a ghost (dimmed, no chip) and the part below carries
  // the chip, so the band never hides a role tag.
  const gap = gapFor(W);
  const out = [];
  zones.forEach((zone) => {
    const slant = zone.h * 0.28;
    const sw = (zone.w + slant - gap * 3) / 4;
    for (let i = 0; i < 4; i++) {
      const x0 = zone.x + i * (sw + gap) - slant;
      out.push({
        x: x0,
        y: zone.y,
        w: sw + slant,
        h: zone.h,
        slant,
        ghost: zone.y === 0 && zones.length > 1,
        slice: i,
        zone,
      });
    }
  });
  return out;
}

function drawSlantedSlice(ctx, panel, state, chips, W) {
  const { x, y, w, h, slant } = panel;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.clip();
  const drawn = drawPhotoInto(ctx, panel.img, { x, y, w, h }, panel, state.grade, state.intensity, panel.ghost);
  if (!drawn) {
    ctx.fillStyle = '#1a1024';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.stroke();
  ctx.restore();
  if (!panel.ghost) chips.push(chipJob({ x: x + slant * 0.5, y, w: w - slant, h }, panel.role, W));
}

function magazinePanels(zones, W) {
  const zone = zones.reduce((big, z) => (z.h * z.w > big.h * big.w ? z : big), zones[0]);
  const gap = gapFor(W);
  const spineW = Math.max(18, Math.round(W * 0.028));
  const heroW = Math.round((zone.w - gap * 2 - spineW) * 0.55);
  const gridX = zone.x + heroW + gap + spineW;
  const gridW = zone.w - heroW - spineW - gap * 2;
  const miniH = (zone.h - gap) / 2;
  const miniW = (gridW - gap) / 2;
  const hero = { x: zone.x, y: zone.y, w: heroW, h: zone.h, duo: true };
  const minis = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      minis.push({ x: gridX + c * (miniW + gap), y: zone.y + r * (miniH + gap), w: miniW, h: miniH });
    }
  }
  return { hero, minis, spine: { x: zone.x + heroW + gap, y: zone.y, w: spineW, h: zone.h }, zone };
}

function drawTitleBand(ctx, state, W, band, titleSize) {
  const g = GRADES[state.grade] ?? GRADES.sunset;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, band.y, 0, band.y + titleSize);
  grad.addColorStop(0, g.title[0]);
  grad.addColorStop(0.55, g.title[1]);
  grad.addColorStop(1, g.title[2]);
  ctx.font = `${titleSize}px Anton, "Arial Black", sans-serif`;
  // Measure on an ALPHABETIC baseline: actualBoundingBoxAscent is measured
  // from the current textBaseline, and this function starts on 'middle' —
  // measuring there understates the cap height by ~44px at 157px type, so
  // the baseline came out too high and the caps clipped at the band's edge.
  ctx.textBaseline = 'alphabetic';
  // Place the title from its measured cap height: a 'middle' baseline
  // centres the em box, and Anton's caps sit high in it, which clipped the
  // tops of the letters at the band's edge.
  const metrics = ctx.measureText(state.title);
  const capH = metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : titleSize * 0.72;
  const titleBaseline = band.y + titleSize * 0.1 + capH;
  if (state.shadow > 0) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = state.shadow;
    ctx.shadowOffsetY = Math.round(state.shadow * 0.35);
  }
  if (state.outline) {
    ctx.lineWidth = Math.max(1, state.outlineWidth);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14081f';
    ctx.strokeText(state.title, W / 2, titleBaseline);
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = grad;
  ctx.fillText(state.title, W / 2, titleBaseline);
  ctx.textBaseline = 'middle';
  // Subtitle and tagline share the band under the title.
  const subSize = Math.max(12, Math.round(titleSize * 0.22));
  ctx.font = `700 ${subSize}px Anton, "Arial Black", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText((state.subtitle || '').toUpperCase(), W / 2, band.y + titleSize * 1.22);
  const tagSize = Math.max(11, Math.round(titleSize * 0.17));
  ctx.font = `italic 600 ${tagSize}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(state.tagline || '', W / 2, band.y + titleSize * 1.52);
  ctx.restore();
}

function drawFurniture(ctx, state, W, furniture) {
  const { y, h } = furniture;
  ctx.save();
  ctx.fillStyle = '#0d0616';
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, y, W, 1);
  // Seal: a gold ring in the furniture strip, radius 34.
  const r = 34;
  const cx = Math.max(r + 16, W * 0.07);
  const cy = y + h / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#160a24';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ffd76a';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,215,106,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffd76a';
  ctx.font = `700 ${Math.round(r * 0.62)}px Anton, "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, cy - r * 0.28);
  ctx.font = `700 ${Math.round(r * 0.26)}px Anton, "Arial Black", sans-serif`;
  ctx.fillText('LEONIDA', cx, cy + r * 0.22);
  ctx.font = `600 ${Math.round(r * 0.2)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,233,168,0.85)';
  ctx.fillText('EST. 2026', cx, cy + r * 0.52);
  // Billing block, centred.
  const bx = W / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `600 ${Math.max(9, Math.round(h * 0.16))}px system-ui, sans-serif`;
  ctx.fillText('A LEONIDA PICTURE  •  VICE HEAT STUDIO  •  MADE WITH YOUR OWN PHOTOS', bx, y + h * 0.34);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('NO ROCKSTAR ARTWORK  •  ANTON (OFL)  •  ISSUE 01 — LEONIDA', bx, y + h * 0.68);
  // Star strip, right of the strip.
  ctx.fillStyle = '#ffd76a';
  ctx.font = `${Math.max(13, Math.round(h * 0.3))}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('★★★★★', W - 18, y + h / 2 + 1);
  ctx.restore();
}

function drawQuoteBar(ctx, state, W, y, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 4, 18, 0.82)';
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `italic 600 ${Math.max(12, Math.round(h * 0.42))}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.quote || '', W / 2, y + h / 2 + 1);
  ctx.restore();
}

// The one entry point: paint the whole cover for a state at W x H.
// Returns the panel rects in draw order, so the editor can hit-test them.
export function renderCover(ctx, state, W, H) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0616';
  ctx.fillRect(0, 0, W, H);
  const titleSize = Math.max(40, Math.min(170, Math.round(W * 0.082)));
  const { band, furniture, zones, quoteH, pos } = layoutZones(W, H, state.titlePos, titleSize, state.layout);
  const chips = [];
  const rects = [];
  const gap = gapFor(W);

  if (state.layout === 'grid') {
    const cells = gridPanels(zones, W);
    cells.forEach((cell, i) => {
      const panel = state.panels[i] ?? blankPanel(null);
      const rect = { x: cell.x, y: cell.y, w: cell.w, h: cell.h };
      rects.push({ ...rect, panelIndex: i, duo: !!cell.duo });
      if (!drawPhotoInto(ctx, panel.img, rect, panel, state.grade, state.intensity, false)) {
        drawEmptyPanel(ctx, rect, panel.role);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(2, W * 0.002);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      chips.push(chipJob(rect, panel.role, W));
    });
    drawCallout(ctx, cells[0], 'WANTED', -0.06, W);
    drawCallout(ctx, cells[8], 'NEW', 0.06, W);
  } else if (state.layout === 'slanted') {
    const slices = slantedPanels(zones, W);
    slices.forEach((slice, i) => {
      const panel = state.panels[i % state.panels.length] ?? blankPanel(null);
      const rect = { x: slice.x, y: slice.y, w: slice.w, h: slice.h };
      rects.push({ ...rect, panelIndex: i % state.panels.length, slice: slice.slice });
      drawSlantedSlice(ctx, { ...panel, ...slice }, state, chips, W);
    });
    drawCallout(ctx, { x: slices[0]?.x ?? 0, y: slices[0]?.y ?? 0, w: 120, h: 60 }, 'VICE', -0.08, W);
  } else if (state.layout === 'four') {
    const rows = rowsAcrossZones(zones, 2);
    const cells = [];
    rows.forEach(({ zone, row, rows: rowsInZone }) => {
      const cw = (zone.w - gap) / 2;
      const ch = (zone.h - gap * (rowsInZone - 1)) / rowsInZone;
      for (let c = 0; c < 2; c++) {
        cells.push({ x: zone.x + c * (cw + gap), y: zone.y + row * (ch + gap), w: cw, h: ch });
      }
    });
    cells.slice(0, 4).forEach((cell, i) => {
      const panel = state.panels[i] ?? blankPanel(null);
      const rect = { x: cell.x, y: cell.y, w: cell.w, h: cell.h };
      rects.push({ ...rect, panelIndex: i });
      if (!drawPhotoInto(ctx, panel.img, rect, panel, state.grade, state.intensity, false)) {
        drawEmptyPanel(ctx, rect, panel.role);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(2, W * 0.002);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      chips.push(chipJob(rect, panel.role, W));
    });
  } else if (state.layout === 'single') {
    // Hero is not re-laid-out: it fills the largest free zone full-bleed.
    const zone = zones.reduce((big, z) => (z.h * z.w > big.h * big.w ? z : big), zones[0]);
    const panel = state.panels[4] ?? blankPanel('duo');
    const rect = { x: zone.x, y: zone.y, w: zone.w, h: zone.h };
    rects.push({ ...rect, panelIndex: 4, hero: true });
    if (!drawPhotoInto(ctx, panel.img, rect, panel, state.grade, state.intensity, false)) {
      drawEmptyPanel(ctx, rect, panel.role);
    }
    chips.push(chipJob(rect, panel.role, W));
    drawCallout(ctx, { x: rect.x, y: rect.y, w: 140, h: 60 }, 'LEONIDA', -0.05, W);
  } else if (state.layout === 'magazine') {
    const { hero, minis, spine, zone } = magazinePanels(zones, W);
    const duo = state.panels[4] ?? blankPanel('duo');
    rects.push({ ...hero, panelIndex: 4, hero: true });
    if (!drawPhotoInto(ctx, duo.img, hero, duo, state.grade, state.intensity, false)) {
      drawEmptyPanel(ctx, hero, duo.role);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeRect(hero.x, hero.y, hero.w, hero.h);
    chips.push(chipJob(hero, duo.role, W));
    const miniKeys = [0, 1, 2, 3];
    minis.forEach((mini, i) => {
      const panel = state.panels[miniKeys[i]] ?? blankPanel(null);
      rects.push({ ...mini, panelIndex: miniKeys[i] });
      if (!drawPhotoInto(ctx, panel.img, mini, panel, state.grade, state.intensity, false)) {
        drawEmptyPanel(ctx, mini, panel.role);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1.5, W * 0.0015);
      ctx.strokeRect(mini.x, mini.y, mini.w, mini.h);
      chips.push(chipJob(mini, panel.role, W));
    });
    // Spine between hero and mini-grid.
    ctx.save();
    ctx.fillStyle = '#160a24';
    ctx.fillRect(spine.x, spine.y, spine.w, spine.h);
    ctx.fillStyle = '#ffd76a';
    ctx.font = `700 ${Math.max(10, Math.round(spine.w * 0.5))}px Anton, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(spine.x + spine.w / 2, spine.y + spine.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('VICE HEAT  •  ISSUE 01 — LEONIDA', 0, 0);
    ctx.restore();
    void zone;
  }

  // Quote bar sits on the seam between the panels and the furniture.
  drawQuoteBar(ctx, state, W, furniture.y - quoteH, quoteH);

  drawTitleBand(ctx, state, W, band, titleSize);
  drawFurniture(ctx, state, W, furniture);

  // Role chips dead last, after every panel.
  chips.forEach((job) => drawChip(ctx, job));

  ctx.restore();
  return { rects, band, furniture, titleSize, titlePosUsed: pos };
}
