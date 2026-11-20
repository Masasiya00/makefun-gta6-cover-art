// VICE HEAT: Leonida Cover Studio — cover rendering engine.
// Pure canvas code: no DOM access except the 2d context it is handed.
// Every cover is drawn from a state object, so the editor, the exporter
// and the headless screenshot driver all render the exact same art.

export const PANELS = [
  { id: 'beach', role: 'VICE BEACH', sample: 'beach.jpg', note: 'Surfer di gulungan ombak turquoise' },
  { id: 'duo', role: 'THE DUO', sample: 'duo.jpg', note: 'Pasangan berpelukan saat sunset' },
  { id: 'skyline', role: 'VICE CITY', sample: 'skyline.jpg', note: 'Ocean Drive malam, art-deco, palem, neon' },
  { id: 'car', role: 'GETAWAY DRIVER', sample: 'car.jpg', note: 'Menyetir saat senja, bokeh lampu kota' },
  { id: 'heli', role: 'AIR SUPPORT', sample: 'heli.jpg', note: 'Heli rescue kuning + kapal coast-guard' },
  { id: 'pool', role: 'POOLSIDE', sample: 'pool.jpg', note: 'Perenang kupu-kupu mid-stroke' },
  { id: 'boulevard', role: 'BOULEVARD', sample: 'boulevard.jpg', note: 'Wanita di samping mobil' },
  { id: 'pier', role: 'THE PIER', sample: 'pier.jpg', note: 'Memancing di dermaga' },
  { id: 'gator', role: 'LEONIDA WILD', sample: 'gator.jpg', note: 'Menunjuk buaya muda' },
];

export const LAYOUTS = {
  grid: { name: '9-Panel Cover Grid', blurb: 'Grid 3 kolom ala cover resmi, duo tengah besar' },
  slanted: { name: 'Slanted Panels', blurb: '5 slice miring vertikal' },
  four: { name: '4-Panel', blurb: 'Grid 2 x 2' },
  hero: { name: 'Single Hero', blurb: 'Satu foto duo besar + judul' },
  magazine: { name: 'Magazine Spread', blurb: 'Double-page: hero kiri + grid mini 2 x 2 kanan' },
};

export const GRADES = {
  sunset: { name: 'Sunset', sat: 1.35, con: 1.12, bri: 1.03, hue: -12, sep: 0.08, tint: '#ff7a18', tintA: 0.14 },
  neon: { name: 'Neon Night', sat: 1.5, con: 1.15, bri: 1.0, hue: 18, sep: 0, tint: '#ff2ea6', tintA: 0.12 },
  twilight: { name: 'Twilight Gold', sat: 1.25, con: 1.08, bri: 1.05, hue: -25, sep: 0.15, tint: '#ffb347', tintA: 0.16 },
  coral: { name: 'Coral Heat', sat: 1.4, con: 1.1, bri: 1.02, hue: -8, sep: 0.05, tint: '#ff5a5a', tintA: 0.14 },
  violet: { name: 'Vice Violet', sat: 1.3, con: 1.1, bri: 1.0, hue: 35, sep: 0, tint: '#8b5cf6', tintA: 0.14 },
  mono: { name: 'Mono Noir', sat: 0, con: 1.18, bri: 1.02, hue: 0, sep: 0, tint: '#111111', tintA: 0.06 },
  ocean: { name: 'Ocean Drive', sat: 1.3, con: 1.1, bri: 1.04, hue: -42, sep: 0, tint: '#00b8c4', tintA: 0.16 },
  bubblegum: { name: 'Bubblegum', sat: 1.45, con: 1.05, bri: 1.06, hue: 22, sep: 0, tint: '#ff7ad9', tintA: 0.16 },
};

export const ALT_TITLES = ['VICE HEAT', 'NEON VICE', 'GOLDEN HOUR', 'LEONIDA NIGHTS', 'SUNSET HEIST'];

export const EXPORT_SIZES = [
  { label: '1080 x 1080', w: 1080, h: 1080 },
  { label: '1080 x 1350', w: 1080, h: 1350 },
  { label: '1920 x 1080', w: 1920, h: 1080 },
  { label: '1080 x 1920', w: 1080, h: 1920 },
];

export const SUBTITLE = 'WELCOME TO LEONIDA';
export const TAGLINE = 'Two outlaws. One last score. No way back.';
export const QUOTE = 'The sun never sets on Vice City.';
export const BILLING = 'LEONIDA PICTURES  •  A VICE HEAT PRODUCTION  •  STARRING THE DUO  •  MUSIC BY NEON COAST  •  FILMED IN VICE CITY, LEONIDA';

export function defaultState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    intensity: 85,
    title: 'VICE HEAT',
    titlePos: 'top',
    titleOutline: true,
    outlineWidth: 55,
    shadow: 60,
    panels: PANELS.map((p) => ({ id: p.id, role: p.role, photo: p.sample, panX: 0, panY: 0, zoom: 1 })),
  };
}

export function panelDef(id) {
  return PANELS.find((p) => p.id === id) ?? PANELS[0];
}

export function photoUrl(photo) {
  if (typeof photo === 'string' && photo.startsWith('data:')) return photo;
  return `samples/${photo}`;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Panel geometry for a layout in a W x H canvas. Each entry: { id, x, y, w, h, points? }.
// `points` (slanted slices) is a polygon; otherwise the panel is a rectangle.
export function layoutPanels(layout, W, H) {
  const pad = Math.round(Math.min(W, H) * 0.012);
  const gap = Math.round(Math.min(W, H) * 0.008);
  if (layout === 'hero') {
    return [{ id: 'duo', x: 0, y: 0, w: W, h: H }];
  }
  if (layout === 'four') {
    const cw = (W - 2 * pad - gap) / 2;
    const ch = (H - 2 * pad - gap) / 2;
    const ids = ['duo', 'beach', 'skyline', 'car'];
    return ids.map((id, i) => ({
      id,
      x: pad + (i % 2) * (cw + gap),
      y: pad + Math.floor(i / 2) * (ch + gap),
      w: cw,
      h: ch,
    }));
  }
  if (layout === 'slanted') {
    const ids = ['duo', 'beach', 'skyline', 'car', 'heli'];
    const slant = Math.round(H * 0.07);
    const sw = W / ids.length;
    return ids.map((id, i) => {
      const x0 = i * sw;
      const x1 = (i + 1) * sw;
      return {
        id,
        x: x0,
        y: 0,
        w: sw,
        h: H,
        points: [
          [x0 + slant, 0],
          [x1 + slant, 0],
          [x1, H],
          [x0, H],
        ],
      };
    });
  }
  if (layout === 'magazine') {
    const mast = Math.round(H * 0.155);
    const leftW = Math.round(W * 0.54);
    const rightX = pad + leftW + gap;
    const rightW = W - rightX - pad;
    const bodyH = H - mast - 2 * pad;
    const miniW = (rightW - gap) / 2;
    const miniH = (bodyH - gap) / 2;
    const minis = ['beach', 'skyline', 'car', 'heli'];
    const out = [{ id: 'duo', x: pad, y: mast + pad, w: leftW, h: bodyH }];
    minis.forEach((id, i) => {
      out.push({
        id,
        x: rightX + (i % 2) * (miniW + gap),
        y: mast + pad + Math.floor(i / 2) * (miniH + gap),
        w: miniW,
        h: miniH,
      });
    });
    return out;
  }
  // grid: 3 x 3, duo in the centre drawn 1.32x so it pops over its neighbours.
  const cw = (W - 2 * pad - 2 * gap) / 3;
  const ch = (H - 2 * pad - 2 * gap) / 3;
  const order = ['beach', 'skyline', 'heli', 'car', 'duo', 'pool', 'boulevard', 'pier', 'gator'];
  return order.map((id, i) => {
    const cx = pad + (i % 3) * (cw + gap);
    const cy = pad + Math.floor(i / 3) * (ch + gap);
    if (id === 'duo') {
      const s = 1.32;
      const w = cw * s;
      const h = ch * s;
      return { id, x: cx + (cw - w) / 2, y: cy + (ch - h) / 2, w, h };
    }
    return { id, x: cx, y: cy, w: cw, h: ch };
  });
}

// CSS filter string for a grade at an intensity of 0-100. At 0 the photo is untouched.
export function gradeFilter(gradeId, intensity) {
  const g = GRADES[gradeId] ?? GRADES.sunset;
  const t = clamp(intensity, 0, 100) / 100;
  const sat = 1 + (g.sat - 1) * t;
  const con = 1 + (g.con - 1) * t;
  const bri = 1 + (g.bri - 1) * t;
  const hue = g.hue * t;
  const sep = g.sep * t;
  return `saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)}) brightness(${bri.toFixed(3)}) hue-rotate(${hue.toFixed(1)}deg) sepia(${sep.toFixed(3)})`;
}

// Draw one photo so it always fully covers its panel: the scale is the
// cover-fit scale times zoom, and the pan is clamped to the leftover slack,
// so no empty strip can ever appear at a panel edge.
export function drawPhotoCover(ctx, img, x, y, w, h, panX, panY, zoom) {
  if (!img || !img.naturalWidth) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(w / iw, h / ih) * clamp(zoom, 1, 3);
  const dw = iw * base;
  const dh = ih * base;
  const slackX = Math.max(0, (dw - w) / 2);
  const slackY = Math.max(0, (dh - h) / 2);
  const dx = x + (w - dw) / 2 + clamp(panX, -1, 1) * slackX;
  const dy = y + (h - dh) / 2 + clamp(panY, -1, 1) * slackY;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function clipPanel(ctx, g) {
  ctx.beginPath();
  if (g.points) {
    ctx.moveTo(g.points[0][0], g.points[0][1]);
    for (let i = 1; i < g.points.length; i++) ctx.lineTo(g.points[i][0], g.points[i][1]);
    ctx.closePath();
  } else {
    ctx.rect(g.x, g.y, g.w, g.h);
  }
  ctx.clip();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawRoleChip(ctx, g, role, selected, scale) {
  const fs = Math.max(11, Math.round(15 * scale));
  ctx.font = `${fs}px Anton, "Arial Black", sans-serif`;
  const tw = ctx.measureText(role).width;
  const pw = tw + fs * 1.1;
  const ph = fs * 1.9;
  const px = g.x + Math.max(6, 10 * scale);
  const py = g.y + g.h - ph - Math.max(6, 10 * scale);
  ctx.save();
  ctx.fillStyle = selected ? 'rgba(255,46,136,0.92)' : 'rgba(10,8,18,0.78)';
  roundRect(ctx, px, py, pw, ph, ph / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(role, px + fs * 0.55, py + ph / 2 + 1);
  ctx.restore();
  return { x: px, y: py, w: pw, h: ph };
}

function drawTitleBlock(ctx, state, W, H) {
  const scale = W / 1080;
  const titleSize = Math.round(W * 0.115);
  const yBase =
    state.titlePos === 'middle' ? H * 0.47 : state.titlePos === 'bottom' ? H * 0.86 : H * 0.1;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Subtitle above the title.
  const subSize = Math.round(titleSize * 0.24);
  ctx.font = `${subSize}px Anton, "Arial Black", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(subSize * 0.35)}px`;
  } catch (_) {
    /* letterSpacing is Chromium-only; harmless elsewhere */
  }
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText(SUBTITLE, W / 2, yBase - titleSize * 0.62);
  try {
    ctx.letterSpacing = '0px';
  } catch (_) {
    /* ignore */
  }
  // Big gradient title.
  const grad = ctx.createLinearGradient(W / 2 - titleSize * 2.4, 0, W / 2 + titleSize * 2.4, 0);
  grad.addColorStop(0, '#ff2e88');
  grad.addColorStop(0.5, '#ff7a18');
  grad.addColorStop(1, '#ffd319');
  ctx.font = `${titleSize}px Anton, "Arial Black", sans-serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(((state.shadow ?? 60) / 100) * 42 * scale) + 2;
  ctx.shadowOffsetY = Math.round(4 * scale);
  if (state.titleOutline) {
    ctx.lineWidth = Math.max(2, Math.round((((state.outlineWidth ?? 55) / 100) * 14 + 2) * scale));
    ctx.strokeStyle = '#12081f';
    ctx.lineJoin = 'round';
    ctx.strokeText(state.title, W / 2, yBase);
  }
  ctx.fillStyle = grad;
  ctx.fillText(state.title, W / 2, yBase);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // Tagline under the title.
  const tagSize = Math.round(titleSize * 0.21);
  ctx.font = `italic ${tagSize}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.fillText(TAGLINE, W / 2, yBase + titleSize * 0.58);
  ctx.restore();
}

function drawFurniture(ctx, state, W, H) {
  const scale = W / 1080;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Five-star strip, top right.
  const starSize = Math.round(26 * scale);
  ctx.font = `${starSize}px Georgia, serif`;
  ctx.fillStyle = '#ffd319';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 6;
  ctx.fillText('★ ★ ★ ★ ★', W - Math.round(92 * scale), Math.round(34 * scale));
  ctx.shadowBlur = 0;
  // Round LEONIDA seal, bottom right.
  const sr = Math.round(46 * scale);
  const sx = W - sr - Math.round(22 * scale);
  const sy = H - sr - Math.round(74 * scale);
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(12,8,20,0.82)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.strokeStyle = '#ffd319';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, sy, sr - Math.max(4, 7 * scale), 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,211,25,0.7)';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.stroke();
  ctx.fillStyle = '#ffd319';
  ctx.font = `${Math.round(13 * scale)}px Anton, "Arial Black", sans-serif`;
  ctx.fillText('LEONIDA', sx, sy - Math.round(10 * scale));
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(11 * scale)}px Anton, "Arial Black", sans-serif`;
  ctx.fillText('★ EST. 2026 ★', sx, sy + Math.round(10 * scale));
  // Billing block, bottom centre.
  const billSize = Math.max(9, Math.round(12.5 * scale));
  ctx.font = `${billSize}px Anton, "Arial Black", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(BILLING, W / 2, H - Math.round(40 * scale));
  // Quote bar, just above the billing.
  const qSize = Math.max(10, Math.round(16 * scale));
  ctx.font = `italic ${qSize}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`“${QUOTE}”`, W / 2, H - Math.round(62 * scale));
  ctx.restore();
}

// Draw the whole cover. `images` maps a photo key (sample filename or data
// URL) to a loaded HTMLImageElement. Returns the drawn geometry, including
// each role label's rectangle, for hit-testing in the editor.
export function drawCover(ctx, state, images, W, H) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0b12';
  ctx.fillRect(0, 0, W, H);
  const scale = W / 1080;
  const geom = layoutPanels(state.layout, W, H);
  const byId = new Map(state.panels.map((p) => [p.id, p]));
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const tintA = grade.tintA * clamp(state.intensity, 0, 100) / 100;
  const filter = gradeFilter(state.grade, state.intensity);
  // Duo draws last in the grid so its oversized centre panel overlaps neighbours.
  const ordered = [...geom].sort((a, b) => (a.id === 'duo' ? 1 : b.id === 'duo' ? -1 : 0));
  const drawn = [];
  for (const g of ordered) {
    const panel = byId.get(g.id);
    if (!panel) continue;
    const img = images.get(panel.photo);
    ctx.save();
    clipPanel(ctx, g);
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(g.x, g.y, g.w, g.h);
    if (img) {
      ctx.filter = filter;
      drawPhotoCover(ctx, img, g.x, g.y, g.w, g.h, panel.panX, panel.panY, panel.zoom);
      ctx.filter = 'none';
      if (tintA > 0.005) {
        ctx.globalAlpha = tintA;
        ctx.fillStyle = grade.tint;
        ctx.fillRect(g.x, g.y, g.w, g.h);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    // Panel frame.
    ctx.save();
    if (g.points) {
      ctx.beginPath();
      ctx.moveTo(g.points[0][0], g.points[0][1]);
      for (let i = 1; i < g.points.length; i++) ctx.lineTo(g.points[i][0], g.points[i][1]);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.rect(g.x, g.y, g.w, g.h);
    }
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
    ctx.restore();
    const label = drawRoleChip(ctx, g, panel.role, false, scale);
    drawn.push({ ...g, role: panel.role, label });
  }
  if (state.layout === 'magazine') {
    // Masthead band + spine line make the spread read as two pages.
    const mast = Math.round(H * 0.155);
    ctx.save();
    const band = ctx.createLinearGradient(0, 0, 0, mast);
    band.addColorStop(0, 'rgba(10,7,18,0.92)');
    band.addColorStop(1, 'rgba(10,7,18,0.55)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, W, mast);
    ctx.strokeStyle = 'rgba(255,211,25,0.85)';
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.beginPath();
    ctx.moveTo(0, mast);
    ctx.lineTo(W, mast);
    ctx.stroke();
    const spineX = Math.round(W * 0.54) + Math.round(Math.min(W, H) * 0.012);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.setLineDash([8 * scale, 6 * scale]);
    ctx.beginPath();
    ctx.moveTo(spineX, mast + 8);
    ctx.lineTo(spineX, H - 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `${Math.max(9, Math.round(12 * scale))}px Anton, "Arial Black", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('ISSUE 01  —  LEONIDA', Math.round(14 * scale), H - Math.round(16 * scale));
    ctx.textAlign = 'right';
    ctx.fillText('VICE HEAT MAGAZINE', W - Math.round(14 * scale), H - Math.round(16 * scale));
    ctx.restore();
  }
  drawFurniture(ctx, state, W, H);
  drawTitleBlock(ctx, state, W, H);
  ctx.restore();
  return drawn;
}

// Shuffle photos across panels, pick a random grade and a random title.
export function shuffleState(state, rng = Math.random) {
  const photos = state.panels.map((p) => p.photo);
  for (let i = photos.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [photos[i], photos[j]] = [photos[j], photos[i]];
  }
  const gradeKeys = Object.keys(GRADES);
  const next = {
    ...state,
    grade: gradeKeys[Math.floor(rng() * gradeKeys.length)],
    title: ALT_TITLES[Math.floor(rng() * ALT_TITLES.length)],
    panels: state.panels.map((p, i) => ({ ...p, photo: photos[i], panX: 0, panY: 0, zoom: 1 })),
  };
  return next;
}
