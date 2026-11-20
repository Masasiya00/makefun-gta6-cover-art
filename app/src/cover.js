// VICE HEAT: Leonida Cover Studio — cover renderer.
// Own design, own lettering, own grade math. No Rockstar logo, artwork or font.
// Pure module: no DOM access at import time, so Node can import it for geometry tests.
// The canvas 2D context is passed in by the caller (browser editor / export).

export const SAMPLES = [
  { id: 'duo', file: 'samples/duo.jpg', label: 'The Duo', role: 'PARTNERS IN CRIME' },
  { id: 'beach', file: 'samples/beach.jpg', label: 'Vice Beach', role: 'VICE BEACH' },
  { id: 'skyline', file: 'samples/skyline.jpg', label: 'Ocean Drive', role: 'OCEAN DRIVE' },
  { id: 'car', file: 'samples/car.jpg', label: 'Getaway Driver', role: 'GETAWAY DRIVER' },
  { id: 'heli', file: 'samples/heli.jpg', label: 'Air Support', role: 'AIR SUPPORT' },
  { id: 'pool', file: 'samples/pool.jpg', label: 'Poolside', role: 'POOLSIDE' },
  { id: 'gator', file: 'samples/gator.jpg', label: 'Leonida Wild', role: 'LEONIDA WILD' },
  { id: 'boulevard', file: 'samples/boulevard.jpg', label: 'Boulevard', role: 'BOULEVARD' },
  { id: 'pier', file: 'samples/pier.jpg', label: 'The Pier', role: 'THE PIER' },
];

export const LAYOUTS = [
  { id: 'grid9', name: '9-Panel Grid' },
  { id: 'slanted', name: 'Slanted' },
  { id: 'four', name: '4-Panel' },
  { id: 'hero', name: 'Single Hero' },
  { id: 'magazine', name: 'Magazine Spread' },
];

// Eight grades. `filter` is a function of intensity t (0..1) returning a CSS filter
// string; at t = 0 the filter is neutral and the overlay alpha is 0, so the raw
// photo shows through. `overlay` is [startColor, endColor, maxAlpha].
export const GRADES = {
  sunset: {
    name: 'Sunset',
    filter: (t) => `saturate(${(1 + 0.35 * t).toFixed(3)}) contrast(${(1 + 0.08 * t).toFixed(3)}) sepia(${(0.25 * t).toFixed(3)}) brightness(${(1 + 0.03 * t).toFixed(3)})`,
    overlay: ['#ff9a3c', '#ff2e88', 0.38],
  },
  neon: {
    name: 'Neon Night',
    filter: (t) => `saturate(${(1 + 0.5 * t).toFixed(3)}) brightness(${(1 + 0.05 * t).toFixed(3)}) hue-rotate(${(-25 * t).toFixed(1)}deg)`,
    overlay: ['#7b2fff', '#00e5ff', 0.34],
  },
  twilight: {
    name: 'Twilight Gold',
    filter: (t) => `sepia(${(0.35 * t).toFixed(3)}) saturate(${(1 + 0.3 * t).toFixed(3)}) brightness(${(1 + 0.06 * t).toFixed(3)})`,
    overlay: ['#ffb347', '#b8860b', 0.3],
  },
  coral: {
    name: 'Coral Heat',
    filter: (t) => `saturate(${(1 + 0.4 * t).toFixed(3)}) sepia(${(0.15 * t).toFixed(3)}) hue-rotate(${(-10 * t).toFixed(1)}deg)`,
    overlay: ['#ff6b4a', '#ff2e63', 0.34],
  },
  violet: {
    name: 'Vice Violet',
    filter: (t) => `saturate(${(1 + 0.45 * t).toFixed(3)}) hue-rotate(${(25 * t).toFixed(1)}deg)`,
    overlay: ['#a855f7', '#ec4899', 0.36],
  },
  noir: {
    name: 'Mono Noir',
    filter: (t) => `grayscale(${t.toFixed(3)}) contrast(${(1 + 0.12 * t).toFixed(3)}) brightness(${(1 + 0.02 * t).toFixed(3)})`,
    overlay: ['#888888', '#222222', 0.12],
  },
  ocean: {
    name: 'Ocean Drive',
    filter: (t) => `saturate(${(1 + 0.3 * t).toFixed(3)}) hue-rotate(${(15 * t).toFixed(1)}deg) brightness(${(1 + 0.04 * t).toFixed(3)})`,
    overlay: ['#00b4d8', '#0077b6', 0.32],
  },
  bubblegum: {
    name: 'Bubblegum',
    filter: (t) => `saturate(${(1 + 0.5 * t).toFixed(3)}) hue-rotate(${(10 * t).toFixed(1)}deg) brightness(${(1 + 0.08 * t).toFixed(3)})`,
    overlay: ['#ff7ad9', '#ff9ebb', 0.36],
  },
};

export const GRADE_IDS = Object.keys(GRADES);

export const TITLES = [
  'VICE HEAT',
  'SUNSET HEIST',
  'LEONIDA NIGHTS',
  'OCEAN DRIVE',
  'PARTNERS IN CRIME',
  'BOULEVARD QUEEN',
];

export const SEAL_TEXT = 'LEONIDA ★ EST. 2026';
export const SEAL_RADIUS = 34;
export const DUO_FACTOR = 1.32;

export function titleSizeFor(w) {
  return Math.round(Math.max(44, Math.min(120, w * 0.085)));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function rectsOverlap(a, b) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)));
  return x > 0.5 && y > 0.5;
}

// Zones: the title owns its own horizontal band (height 1.78x the title size),
// the furniture strip owns the bottom, the quote bar sits just above the strip,
// and panels live ONLY in the remaining zone(s). Nothing overlaps by construction.
// titlePos 'middle' centres the band between the top edge and the quote bar, which
// splits the panel zone into an upper and a lower rect.
// NOTE (Magazine fallback): Magazine Spread + title position 'Middle' falls back
// to the top band, because a centred band would cut the hero duo and the 2x2 mini
// grid apart; the magazine masthead already anchors the top of the page.
export function computeZones(w, h, titlePos, layout) {
  const titleSize = titleSizeFor(w);
  const bandH = Math.round(titleSize * 1.78);
  const stripH = Math.round(clamp(h * 0.062, 76, 110));
  const quoteH = Math.round(clamp(h * 0.032, 26, 44));
  let pos = titlePos;
  if (layout === 'magazine' && pos === 'middle') pos = 'top';
  const strip = { x: 0, y: h - stripH, w, h: stripH };
  const quote = { x: 0, y: h - stripH - quoteH, w, h: quoteH };
  const topLimit = 0;
  const bottomLimit = quote.y;
  let band;
  let areas;
  if (pos === 'top') {
    band = { x: 0, y: topLimit, w, h: bandH };
    areas = [{ x: 0, y: band.y + band.h, w, h: bottomLimit - (band.y + band.h) }];
  } else if (pos === 'bottom') {
    band = { x: 0, y: bottomLimit - bandH, w, h: bandH };
    areas = [{ x: 0, y: topLimit, w, h: band.y - topLimit }];
  } else {
    // middle: band centred in the free vertical space; panels split above/below.
    const freeH = bottomLimit - topLimit;
    const bandY = Math.round(topLimit + (freeH - bandH) / 2);
    band = { x: 0, y: bandY, w, h: bandH };
    areas = [
      { x: 0, y: topLimit, w, h: band.y - topLimit },
      { x: 0, y: band.y + band.h, w, h: bottomLimit - (band.y + band.h) },
    ];
  }
  return { titleSize, bandH, band, quote, strip, areas, titlePos: pos };
}

// Split one rect into a weighted grid (weights sum to 1 per axis after normalising).
function splitWeighted(rect, colW, rowW) {
  const colSum = colW.reduce((a, b) => a + b, 0);
  const rowSum = rowW.reduce((a, b) => a + b, 0);
  const cells = [];
  let y = rect.y;
  for (let r = 0; r < rowW.length; r++) {
    const rh = (rect.h * rowW[r]) / rowSum;
    let x = rect.x;
    for (let c = 0; c < colW.length; c++) {
      const cw = (rect.w * colW[c]) / colSum;
      cells.push({ x, y, w: cw, h: rh });
      x += cw;
    }
    y += rh;
  }
  return cells;
}

function chipFor(panel, role) {
  const chipH = Math.round(clamp(panel.h * 0.16, 20, 34));
  const font = Math.round(clamp(chipH * 0.52, 11, 17));
  const estW = Math.round(role.length * font * 0.62 + 22);
  const chipW = Math.round(clamp(estW, 40, panel.w - 20));
  return {
    x: Math.round(panel.x + 10),
    y: Math.round(panel.y + panel.h - chipH - 10),
    w: chipW,
    h: chipH,
    font,
  };
}

// Apply the panel gutter: shrink every panel rect by half the gap on each side so
// neighbouring panels never touch and never leave the zone.
function applyGaps(rects, gap) {
  const g = gap / 2;
  return rects.map((r) => ({
    ...r,
    x: r.x + g,
    y: r.y + g,
    w: Math.max(4, r.w - gap),
    h: Math.max(4, r.h - gap),
  }));
}

// Panel layout per layout id. Returns { panels, band, quote, strip, titlePos }.
// Every panel carries its role chip rect; chips are drawn LAST by renderCover,
// so no chip can ever be clipped or covered by the title, the furniture or a panel.
export function layoutPanels(w, h, titlePos, layout) {
  const zones = computeZones(w, h, titlePos, layout);
  const gap = Math.max(4, Math.round(w * 0.005));
  const roles = SAMPLES.map((s) => s.role);
  let raw = [];
  if (layout === 'grid9') {
    const cols = [1, DUO_FACTOR, 1];
    const rows = [1, DUO_FACTOR, 1];
    if (zones.areas.length === 1) {
      raw = splitWeighted(zones.areas[0], cols, rows);
    } else {
      // Middle band: the top area holds the first two rows (duo row included),
      // the bottom area holds the last row.
      const top = splitWeighted(zones.areas[0], cols, [1, DUO_FACTOR]);
      const bottom = splitWeighted(zones.areas[1], cols, [1]);
      raw = [...top, ...bottom];
    }
    raw = applyGaps(raw, gap);
    raw = raw.map((r, i) => ({ ...r, index: i, role: roles[i % roles.length], kind: 'rect' }));
  } else if (layout === 'slanted') {
    // Slanted slices: each slice is a parallelogram, split into a ghost top
    // (image only, no chip) and a bottom part that carries the role chip.
    const sliceCounts = zones.areas.length === 1 ? [5] : [3, 2];
    zones.areas.forEach((area, ai) => {
      const n = sliceCounts[ai];
      const sw = area.w / n;
      const slant = sw * 0.22;
      for (let i = 0; i < n; i++) {
        const x0 = area.x + i * sw;
        raw.push({
          x: x0, y: area.y, w: sw + slant, h: area.h,
          index: raw.length, role: roles[raw.length % roles.length],
          kind: 'slant', slant,
          splitY: area.y + area.h * 0.45,
        });
      }
    });
    raw = raw.map((r) => ({ ...r, x: r.x + gap / 2, w: Math.max(4, r.w - gap) }));
  } else if (layout === 'four') {
    if (zones.areas.length === 1) {
      raw = splitWeighted(zones.areas[0], [1, 1], [1, 1]);
    } else {
      raw = [
        ...splitWeighted(zones.areas[0], [1, 1], [1]),
        ...splitWeighted(zones.areas[1], [1, 1], [1]),
      ];
    }
    raw = applyGaps(raw, gap);
    raw = raw.map((r, i) => ({ ...r, index: i, role: roles[i % roles.length], kind: 'rect' }));
  } else if (layout === 'hero') {
    const area = zones.areas.length === 1
      ? zones.areas[0]
      : zones.areas[0].h >= zones.areas[1].h ? zones.areas[0] : zones.areas[1];
    raw = applyGaps([area], gap).map((r) => ({
      ...r, index: 0, role: roles[0], kind: 'hero',
    }));
  } else if (layout === 'magazine') {
    const area = zones.areas[0];
    const heroW = Math.round(area.w * 0.52);
    const spineW = Math.max(28, Math.round(area.w * 0.045));
    const rightX = area.x + heroW + spineW;
    const rightW = area.x + area.w - rightX;
    const mastH = Math.round(area.h * 0.1);
    const gridY = area.y + mastH;
    const gridH = area.y + area.h - gridY;
    const hero = { x: area.x, y: area.y, w: heroW, h: area.h };
    const minis = splitWeighted(
      { x: rightX, y: gridY, w: rightW, h: gridH }, [1, 1], [1, 1],
    );
    raw = applyGaps([hero, ...minis], gap).map((r, i) => ({
      ...r, index: i, role: roles[i % roles.length], kind: i === 0 ? 'hero' : 'rect',
    }));
    const panels = raw.map((p) => ({ ...p, chip: chipFor(p, p.role) }));
    return {
      panels, band: zones.band, quote: zones.quote, strip: zones.strip,
      titlePos: zones.titlePos, titleSize: zones.titleSize,
      magazine: {
        hero: raw[0], spine: { x: area.x + heroW, y: area.y, w: spineW, h: area.h },
        masthead: { x: rightX, y: area.y, w: rightW, h: mastH },
      },
    };
  }
  const panels = raw.map((p) => ({ ...p, chip: chipFor(p, p.role) }));
  return {
    panels, band: zones.band, quote: zones.quote, strip: zones.strip,
    titlePos: zones.titlePos, titleSize: zones.titleSize, magazine: null,
  };
}

// Pan clamp: offsets may never leave a gap at a panel edge.
export function clampCrop(imgW, imgH, panelW, panelH, crop) {
  const base = Math.max(panelW / imgW, panelH / imgH);
  const s = base * crop.zoom;
  const dw = imgW * s;
  const dh = imgH * s;
  const maxOx = Math.max(0, (dw - panelW) / 2);
  const maxOy = Math.max(0, (dh - panelH) / 2);
  return {
    zoom: crop.zoom,
    ox: clamp(crop.ox, -maxOx, maxOx),
    oy: clamp(crop.oy, -maxOy, maxOy),
  };
}

export { rectsOverlap };

// ---- rendering ----

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

function slantPolygon(panel) {
  const { x, y, w, h, slant } = panel;
  return [
    [x + slant, y],
    [x + w, y],
    [x + w - slant, y + h],
    [x, y + h],
  ];
}

function tracePolygon(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

// Split a slanted slice polygon at a horizontal line: returns [topPoly, bottomPoly].
// The split is linear in the slant: at fraction t down the slice, the left edge
// has moved from x+slant to x and the right edge from x+w to x+w-slant.
function splitSlant(panel) {
  const { x, y, w, h, slant, splitY } = panel;
  const t = (splitY - y) / h;
  // Left edge moves from x+slant (top) to x (bottom); right edge from x+w (top)
  // to x+w-slant (bottom). At split fraction t the edges sit at:
  const lx = x + slant * (1 - t);
  const rx = x + w - slant * t;
  const topPoly = [[x + slant, y], [x + w, y], [rx, splitY], [lx, splitY]];
  const bottomPoly = [[lx, splitY], [rx, splitY], [x + w - slant, y + h], [x, y + h]];
  return [topPoly, bottomPoly];
}

function drawImageCover(ctx, img, rect, crop) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const c = clampCrop(iw, ih, rect.w, rect.h, crop);
  const base = Math.max(rect.w / iw, rect.h / ih);
  const s = base * c.zoom;
  const dw = iw * s;
  const dh = ih * s;
  const cx = rect.x + rect.w / 2 + c.ox;
  const cy = rect.y + rect.h / 2 + c.oy;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

function applyGradeWash(ctx, rect, grade, t) {
  const [c0, c1, maxAlpha] = grade.overlay;
  const a = maxAlpha * t;
  if (a <= 0.001) return;
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawPanelImage(ctx, panel, img, crop, grade, t) {
  const rect = { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
  ctx.save();
  if (panel.kind === 'slant') {
    const [topPoly, bottomPoly] = splitSlant(panel);
    // Ghost top: same photo, dimmed, no chip. Bottom: full photo, carries the chip.
    ctx.save();
    tracePolygon(ctx, topPoly);
    ctx.clip();
    ctx.globalAlpha = 0.55;
    ctx.filter = grade.filter(t);
    if (img) drawImageCover(ctx, img, rect, crop);
    ctx.restore();
    ctx.save();
    tracePolygon(ctx, bottomPoly);
    ctx.clip();
    ctx.filter = grade.filter(t);
    if (img) drawImageCover(ctx, img, rect, crop);
    ctx.restore();
    ctx.filter = 'none';
    // Grade wash over the whole slice, clipped to the slice polygon.
    tracePolygon(ctx, slantPolygon(panel));
    ctx.clip();
    applyGradeWash(ctx, rect, grade, t);
    ctx.restore();
    ctx.save();
    tracePolygon(ctx, slantPolygon(panel));
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  } else {
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.clip();
    if (!img) {
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g.addColorStop(0, '#3b1155');
      g.addColorStop(1, '#12081f');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    } else {
      ctx.filter = grade.filter(t);
      drawImageCover(ctx, img, rect, crop);
      ctx.filter = 'none';
    }
    applyGradeWash(ctx, rect, grade, t);
    ctx.restore();
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawTitleBand(ctx, band, state, titleSize) {
  const g = ctx.createLinearGradient(band.x, band.y, band.x + band.w, band.y + band.h);
  g.addColorStop(0, 'rgba(24,8,40,0.96)');
  g.addColorStop(0.5, 'rgba(58,12,58,0.96)');
  g.addColorStop(1, 'rgba(24,8,40,0.96)');
  ctx.fillStyle = g;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  ctx.fillStyle = 'rgba(255,176,32,0.9)';
  ctx.fillRect(band.x, band.y + band.h - 3, band.w, 3);
  ctx.fillStyle = 'rgba(255,41,117,0.9)';
  ctx.fillRect(band.x, band.y, band.w, 3);

  const cx = band.x + band.w / 2;
  const title = (state.title || 'VICE HEAT').toUpperCase();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${titleSize}px Anton, 'Arial Black', sans-serif`;
  const tg = ctx.createLinearGradient(
    band.x + band.w * 0.15, 0, band.x + band.w * 0.85, 0,
  );
  tg.addColorStop(0, '#ffd319');
  tg.addColorStop(0.5, '#ff2975');
  tg.addColorStop(1, '#8c1eff');
  const titleY = band.y + band.h * 0.44;
  if (state.shadow > 0) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = state.shadow;
    ctx.shadowOffsetY = Math.round(state.shadow * 0.35);
  }
  if (state.outline) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160a1e';
    ctx.lineWidth = Math.max(1, state.outlineWidth || 6);
    ctx.strokeText(title, cx, titleY);
  }
  ctx.fillStyle = tg;
  ctx.fillText(title, cx, titleY);
  ctx.restore();

  const sub = (state.subtitle || '').toUpperCase();
  if (sub) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(titleSize * 0.3)}px Arial, sans-serif`;
    ctx.fillStyle = '#ffe9a8';
    try { ctx.letterSpacing = '6px'; } catch (e) { /* older canvas: ignore */ }
    ctx.fillText(sub, cx, band.y + band.h * 0.84);
    ctx.restore();
  }
}

function drawQuoteBar(ctx, quote, state, w) {
  ctx.fillStyle = 'rgba(10,5,20,0.95)';
  ctx.fillRect(quote.x, quote.y, quote.w, quote.h);
  const fs = Math.round(clamp(quote.h * 0.44, 12, 20));
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffb03a';
  ctx.font = `700 ${fs}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText((state.tagline || '').toUpperCase(), 14, quote.y + quote.h / 2);
  ctx.fillStyle = '#f5f0ff';
  ctx.font = `italic ${fs}px Georgia, serif`;
  ctx.textAlign = 'right';
  ctx.fillText(state.quote || '', w - 14, quote.y + quote.h / 2);
  ctx.restore();
}

function drawFurniture(ctx, strip, w) {
  ctx.fillStyle = '#0d0716';
  ctx.fillRect(strip.x, strip.y, strip.w, strip.h);
  ctx.fillStyle = 'rgba(255,176,32,0.9)';
  ctx.fillRect(strip.x, strip.y, strip.w, 2);
  const midY = strip.y + strip.h / 2;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#cfc4e6';
  ctx.font = `${Math.round(clamp(strip.h * 0.16, 9, 13))}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('A LEONIDA PICTURE  •  VICE HEAT STUDIO  •  IN LEONIDA', 14, midY - strip.h * 0.2);
  ctx.fillText('STARRING THE DUO  •  OCEAN DRIVE  •  BOULEVARD  •  THE PIER', 14, midY + strip.h * 0.22);
  ctx.fillStyle = '#ffd319';
  ctx.font = `${Math.round(clamp(strip.h * 0.26, 14, 22))}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('★ ★ ★ ★ ★', w / 2, midY);
  ctx.restore();
  // Seal: bottom furniture strip, fixed radius 34.
  const sx = w - SEAL_RADIUS - 22;
  const sy = midY;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, SEAL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#ff2975';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffd319';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(SEAL_RADIUS * 0.32)}px Arial, sans-serif`;
  ctx.fillText('LEONIDA', sx, sy - 8);
  ctx.font = `700 ${Math.round(SEAL_RADIUS * 0.26)}px Arial, sans-serif`;
  ctx.fillText('★ EST. 2026', sx, sy + 9);
  ctx.restore();
}

// Main entry: draw the whole cover. `state.panels` is an array of
// { img, crop: {zoom, ox, oy}, role } aligned with the layout's panel slots
// (extra slots are ignored, missing slots render as graded placeholders).
// CHIPS ARE DRAWN LAST, after title, quote bar and furniture, so no chip can
// ever be clipped or covered by anything else on the poster.
export function renderCover(ctx, w, h, state) {
  const layout = state.layout || 'grid9';
  const grade = GRADES[state.grade] || GRADES.sunset;
  const t = Math.max(0, Math.min(100, state.intensity ?? 70)) / 100;
  const laid = layoutPanels(w, h, state.titlePos || 'top', layout);

  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#150a24');
  bg.addColorStop(1, '#0a0614');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  for (const panel of laid.panels) {
    const slot = (state.panels && state.panels[panel.index]) || null;
    drawPanelImage(ctx, panel, slot ? slot.img : null, slot ? slot.crop : { zoom: 1, ox: 0, oy: 0 }, grade, t);
  }

  if (laid.magazine) {
    const { masthead, spine } = laid.magazine;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd319';
    ctx.font = `700 ${Math.round(clamp(masthead.h * 0.52, 14, 34))}px Arial, sans-serif`;
    try { ctx.letterSpacing = '4px'; } catch (e) { /* ignore */ }
    ctx.fillText('VICE HEAT', masthead.x + masthead.w / 2, masthead.y + masthead.h / 2);
    ctx.save();
    ctx.translate(spine.x + spine.w / 2, spine.y + spine.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#f5f0ff';
    ctx.font = `700 ${Math.round(clamp(spine.w * 0.5, 11, 16))}px Arial, sans-serif`;
    ctx.fillText('ISSUE 01 — LEONIDA', 0, 0);
    ctx.restore();
    ctx.restore();
  }

  drawTitleBand(ctx, laid.band, state, laid.titleSize);
  drawQuoteBar(ctx, laid.quote, state, w);
  drawFurniture(ctx, laid.strip, w);

  // Chips last: nothing on the poster may cover or clip a role chip.
  for (const panel of laid.panels) {
    const slot = (state.panels && state.panels[panel.index]) || null;
    const role = (slot && slot.role) || panel.role;
    const chip = panel.chip;
    ctx.save();
    roundRectPath(ctx, chip.x, chip.y, chip.w, chip.h, 7);
    ctx.fillStyle = 'rgba(10,6,18,0.9)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffd319';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let fs = chip.font;
    ctx.font = `700 ${fs}px Arial, sans-serif`;
    const tw = ctx.measureText(role).width;
    if (tw > chip.w - 14) {
      fs = Math.max(8, Math.floor((fs * (chip.w - 14)) / tw));
      ctx.font = `700 ${fs}px Arial, sans-serif`;
    }
    ctx.fillText(role, chip.x + chip.w / 2, chip.y + chip.h / 2 + 1);
    ctx.restore();
  }
  return laid;
}
