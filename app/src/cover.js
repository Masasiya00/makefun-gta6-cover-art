// VICE HEAT — Leonida Cover Studio: canvas cover renderer (no dependencies).
//
// GEOMETRY RULE (the fix that keeps titles off the photos): the title owns a
// horizontal band of its own, 1.78x the title size. Panels live ONLY in the
// zones outside that band and the furniture strip. The duo hero may swell to
// 1.32x its cell, but it is clamped to its zone. In the slanted layout the
// middle slice is split: a dim ghost on top (no chip) and the real slice
// below (carries the chip). Role chips are painted LAST so nothing ever
// clips them, and the seal lives in the furniture strip (radius 34).
(function () {
  'use strict';

  var GAP = 6;
  // The hero duo may swell this far beyond its own cell (clamped to the zone).
  var HERO_SWELL = 1.32;

  // Eight colour grades. Each is a top->bottom wash laid over the photo zone
  // with a blend mode; the intensity slider scales its alpha.
  var GRADES = {
    sunset:   { name: 'Sunset',       top: '#ff9a3c', bottom: '#ff2e88', blend: 'overlay',    alpha: 0.55, accent: '#ffb03a' },
    neon:     { name: 'Neon Night',   top: '#37e0d8', bottom: '#b537f2', blend: 'screen',     alpha: 0.5,  accent: '#37e0d8' },
    twilight: { name: 'Twilight Gold',top: '#ffd166', bottom: '#7a3cff', blend: 'soft-light', alpha: 0.6,  accent: '#ffd166' },
    coral:    { name: 'Coral Heat',   top: '#ff7a59', bottom: '#ff2e63', blend: 'overlay',    alpha: 0.5,  accent: '#ff7a59' },
    violet:   { name: 'Vice Violet',  top: '#c77dff', bottom: '#3a0ca3', blend: 'overlay',    alpha: 0.55, accent: '#c77dff' },
    noir:     { name: 'Mono Noir',    top: '#8a8a8a', bottom: '#111111', blend: 'luminosity', alpha: 0.7,  accent: '#e8e8e8' },
    ocean:    { name: 'Ocean Drive',  top: '#2ec4b6', bottom: '#023e8a', blend: 'soft-light', alpha: 0.6,  accent: '#2ec4b6' },
    bubble:   { name: 'Bubblegum',    top: '#ff8fab', bottom: '#ff5d8f', blend: 'screen',     alpha: 0.45, accent: '#ff8fab' }
  };
  var GRADE_IDS = ['sunset', 'neon', 'twilight', 'coral', 'violet', 'noir', 'ocean', 'bubble'];

  var LAYOUTS = {
    grid9:    { name: '9-Panel Grid',   panels: 9 },
    slanted:  { name: 'Slanted',        panels: 5 },
    four:     { name: '4-Panel',        panels: 4 },
    single:   { name: 'Single Hero',    panels: 1 },
    magazine: { name: 'Magazine Spread',panels: 5 }
  };
  var LAYOUT_IDS = ['grid9', 'slanted', 'four', 'single', 'magazine'];

  // Nine freely licensed sample photos (see app/SOURCES.md). Panel 0 is the
  // duo: the hero of the grid, the single and the magazine spread.
  var SAMPLE_PANELS = [
    { src: 'samples/duo.jpg',       tag: 'THE DUO',      ox: 0, oy: 0, zoom: 1 },
    { src: 'samples/beach.jpg',     tag: 'BEACH DAY',    ox: 0, oy: 0, zoom: 1 },
    { src: 'samples/skyline.jpg',   tag: 'OCEAN DRIVE',  ox: 0, oy: 0, zoom: 1 },
    { src: 'samples/car.jpg',       tag: 'GETAWAY',      ox: 0, oy: 0, zoom: 1 },
    { src: 'samples/heli.jpg',      tag: 'AIR SUPPORT',  ox: 0, oy: 0, zoom: 1 },
    { src: 'samples/pool.jpg',      tag: 'POOLSIDE',     ox: 0, oy: 0, zoom: 1 },
    { src: 'samples/gator.jpg',     tag: 'WILD LEONIDA', ox: 0, oy: 0, zoom: 1 },
    { src: 'samples/boulevard.jpg', tag: 'BOULEVARD',    ox: 0, oy: 0, zoom: 1 },
    { src: 'samples/pier.jpg',      tag: 'THE PIER',     ox: 0, oy: 0, zoom: 1 }
  ];

  var TITLES = ['VICE HEAT', 'NEON VICE', 'GOLDEN HOUR', 'LEONIDA NIGHTS', 'OCEAN DRIVE'];

  function defaultState() {
    return {
      layout: 'grid9',
      grade: 'sunset',
      intensity: 80,
      title: 'VICE HEAT',
      subtitle: 'LEONIDA',
      tagline: 'Welcome back to paradise.',
      quote: '\u201CThe heat never leaves.\u201D \u2014 LEONIDA TIMES',
      titlePos: 'bottom',
      outline: true,
      outlinePx: 5,
      shadowPx: 14,
      previewW: 1280,
      previewH: 720,
      panels: SAMPLE_PANELS.map(function (p) { return { src: p.src, tag: p.tag, ox: p.ox, oy: p.oy, zoom: p.zoom }; })
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // --- geometry ------------------------------------------------------------
  function titlePx(w) { return Math.round(clamp(w * 0.078, 52, 168)); }
  function bandH(w) { return Math.round(titlePx(w) * 1.95); }
  function furnitureH(h) { return Math.max(76, Math.round(h * 0.06)); }

  // The title band. Bottom when asked — EXCEPT the magazine spread and the
  // "middle" position, which both fall back to the TOP band: a middle band
  // would saw the magazine spread (and any hero panel) in half, so the top
  // band is the only safe home for them.
  function titleBand(state, w, h) {
    var bh = bandH(w);
    var fh = furnitureH(h);
    if (state.titlePos === 'bottom' && state.layout !== 'magazine') {
      return { x: 0, y: h - fh - bh, w: w, h: bh };
    }
    return { x: 0, y: 0, w: w, h: bh };
  }

  // The photo zone: everything that is neither the title band nor the
  // furniture strip. Panels are never drawn outside it.
  function panelZone(state, w, h) {
    var band = titleBand(state, w, h);
    var fh = furnitureH(h);
    if (band.y === 0) return { x: 0, y: band.y + band.h, w: w, h: h - band.h - fh };
    return { x: 0, y: 0, w: w, h: h - band.h - fh };
  }

  // Cells for a layout inside the zone. Each cell: {panel, x, y, w, h,
  // shear, clipTop, clipBottom, ghost, heroDuo}. shear slants the cell into a
  // parallelogram; clipTop/clipBottom cut a cell vertically (slanted middle).
  function cellsFor(layout, zone) {
    var cells = [];
    var i, cw, ch, x, y;
    if (layout === 'grid9') {
      cw = (zone.w - GAP * 2) / 3;
      ch = (zone.h - GAP * 2) / 3;
      // Row-major, but the DUO (panel 0) sits in the centre cell.
      var order = [1, 2, 3, 4, 0, 5, 6, 7, 8];
      for (i = 0; i < 9; i++) {
        x = zone.x + (i % 3) * (cw + GAP);
        y = zone.y + Math.floor(i / 3) * (ch + GAP);
        cells.push({ panel: order[i], x: x, y: y, w: cw, h: ch, shear: 0, clipTop: 0, clipBottom: 0, ghost: false, heroDuo: order[i] === 0 });
      }
    } else if (layout === 'slanted') {
      var n = 5;
      var sw = zone.w / n;
      var shear = Math.round(zone.h * 0.055);
      for (i = 0; i < n; i++) {
        x = zone.x + i * sw;
        if (i === 2) {
          // Middle slice, split in two: ghost on top (no chip), real below.
          var mid = zone.y + zone.h / 2;
          cells.push({ panel: 2, x: x, y: zone.y, w: sw, h: zone.h / 2, shear: shear, clipTop: zone.y, clipBottom: mid, ghost: true, heroDuo: false });
          cells.push({ panel: 2, x: x, y: mid, w: sw, h: zone.h / 2, shear: shear, clipTop: mid, clipBottom: zone.y + zone.h, ghost: false, heroDuo: false });
        } else {
          cells.push({ panel: i, x: x, y: zone.y, w: sw, h: zone.h, shear: shear, clipTop: 0, clipBottom: 0, ghost: false, heroDuo: false });
        }
      }
    } else if (layout === 'four') {
      cw = (zone.w - GAP) / 2;
      ch = (zone.h - GAP) / 2;
      for (i = 0; i < 4; i++) {
        x = zone.x + (i % 2) * (cw + GAP);
        y = zone.y + Math.floor(i / 2) * (ch + GAP);
        cells.push({ panel: i, x: x, y: y, w: cw, h: ch, shear: 0, clipTop: 0, clipBottom: 0, ghost: false, heroDuo: false });
      }
    } else if (layout === 'single') {
      cells.push({ panel: 0, x: zone.x, y: zone.y, w: zone.w, h: zone.h, shear: 0, clipTop: 0, clipBottom: 0, ghost: false, heroDuo: true });
    } else { // magazine: hero duo left + 2x2 minis right
      var heroW = Math.round(zone.w * 0.54);
      var miniW = (zone.w - heroW - GAP) / 2;
      var miniH = (zone.h - GAP) / 2;
      cells.push({ panel: 0, x: zone.x, y: zone.y, w: heroW, h: zone.h, shear: 0, clipTop: 0, clipBottom: 0, ghost: false, heroDuo: true });
      for (i = 0; i < 4; i++) {
        x = zone.x + heroW + GAP + (i % 2) * (miniW + GAP);
        y = zone.y + Math.floor(i / 2) * (miniH + GAP);
        cells.push({ panel: i + 1, x: x, y: y, w: miniW, h: miniH, shear: 0, clipTop: 0, clipBottom: 0, ghost: false, heroDuo: false });
      }
    }
    return cells;
  }

  // --- images --------------------------------------------------------------
  var cache = new Map();
  function photo(src, onReady) {
    if (!cache.has(src)) {
      var im = new Image();
      im.onload = function () { if (onReady) onReady(); };
      im.onerror = function () { if (onReady) onReady(); };
      im.src = src;
      cache.set(src, im);
    }
    return cache.get(src);
  }
  function preload(state) {
    var jobs = state.panels.map(function (p) {
      return new Promise(function (resolve) {
        var im = photo(p.src, resolve);
        if (im.complete && im.naturalWidth > 0) resolve();
      });
    });
    return Promise.all(jobs);
  }

  // --- drawing helpers -----------------------------------------------------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Cover-fit draw of one photo into a cell, clamped so the photo ALWAYS
  // covers the cell fully (no gaps, ever). pan.ox/oy are -1..1 fractions of
  // the slack; zoom multiplies the cover scale. heroDuo swells the draw rect
  // to 1.32x the cell, clamped to the zone — and the swell is clipped to the
  // ZONE, never to its own cell (clipping to the cell would cancel it).
  function drawPhoto(ctx, img, cell, pan, zone) {
    var rect = { x: cell.x, y: cell.y, w: cell.w, h: cell.h };
    if (cell.heroDuo) {
      var ew = cell.w * HERO_SWELL, eh = cell.h * HERO_SWELL;
      rect.x = clamp(cell.x + cell.w / 2 - ew / 2, zone.x, zone.x + zone.w - ew);
      rect.y = clamp(cell.y + cell.h / 2 - eh / 2, zone.y, zone.y + zone.h - eh);
      rect.w = ew; rect.h = eh;
    }
    var scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * (pan.zoom || 1);
    var dw = img.naturalWidth * scale;
    var dh = img.naturalHeight * scale;
    var slackX = Math.max(0, (dw - rect.w) / 2);
    var slackY = Math.max(0, (dh - rect.h) / 2);
    var dx = rect.x + (rect.w - dw) / 2 - clamp(pan.ox || 0, -1, 1) * slackX;
    var dy = rect.y + (rect.h - dh) / 2 - clamp(pan.oy || 0, -1, 1) * slackY;
    ctx.save();
    ctx.beginPath();
    if (cell.heroDuo) {
      ctx.rect(zone.x, zone.y, zone.w, zone.h);
    } else if (cell.shear) {
      var s = cell.shear;
      var top = cell.clipTop || cell.y;
      var bot = cell.clipBottom || cell.y + cell.h;
      ctx.moveTo(cell.x + s, top);
      ctx.lineTo(cell.x + cell.w + s, top);
      ctx.lineTo(cell.x + cell.w - s, bot);
      ctx.lineTo(cell.x - s, bot);
      ctx.closePath();
    } else {
      ctx.rect(cell.x, cell.y, cell.w, cell.h);
    }
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    if (cell.ghost) { ctx.fillStyle = 'rgba(13,11,22,0.55)'; ctx.fillRect(cell.x - Math.abs(cell.shear || 0), cell.y, cell.w + 2 * Math.abs(cell.shear || 0), cell.h); }
    ctx.restore();
  }

  function placeholder(ctx, cell, label, hue) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.x, cell.y, cell.w, cell.h);
    ctx.clip();
    var g = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.w, cell.y + cell.h);
    g.addColorStop(0, 'hsl(' + hue + ',70%,38%)');
    g.addColorStop(1, 'hsl(' + (hue + 60) + ',70%,16%)');
    ctx.fillStyle = g;
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '700 ' + Math.max(13, cell.w * 0.05) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cell.x + cell.w / 2, cell.y + cell.h / 2);
    ctx.restore();
  }

  // --- role chips: THE single source of truth ------------------------------
  // Both the renderer and the editor's click hit-test call this one
  // function, so a chip is never drawn somewhere the editor cannot find it.
  var measureCtx = null;
  function chipFont(px) { return '700 ' + px + 'px system-ui, sans-serif'; }
  function getChipRects(state, w, h) {
    var zone = panelZone(state, w, h);
    var cells = cellsFor(state.layout, zone);
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    var chipH = Math.round(clamp(w * 0.026, 22, 36));
    var fontPx = Math.round(chipH * 0.42);
    measureCtx.font = chipFont(fontPx);
    var out = [];
    var seen = {};
    cells.forEach(function (cell) {
      if (cell.ghost) return; // ghost half carries no chip
      var panel = state.panels[cell.panel];
      if (!panel || seen[cell.panel]) return;
      seen[cell.panel] = true;
      var tw = measureCtx.measureText(panel.tag || '').width;
      var cw = Math.min(cell.w - 12, tw + chipH * 0.95);
      out.push({
        x: cell.x + 10, y: cell.y + cell.h - chipH - 10,
        w: cw, h: chipH, panel: cell.panel, tag: panel.tag || ''
      });
    });
    return out;
  }

  function drawChips(ctx, state, w, h) {
    var chips = getChipRects(state, w, h);
    var fontPx;
    chips.forEach(function (c) {
      fontPx = Math.round(c.h * 0.42);
      ctx.save();
      ctx.fillStyle = 'rgba(10,8,18,0.88)';
      rr(ctx, c.x, c.y, c.w, c.h, c.h / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = chipFont(fontPx);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.tag, c.x + c.h * 0.48, c.y + c.h / 2 + 1);
      ctx.restore();
    });
  }

  // --- title band + furniture ----------------------------------------------
  function drawTitleBand(ctx, state, w, h) {
    var band = titleBand(state, w, h);
    var tpx = titlePx(w);
    var grade = GRADES[state.grade] || GRADES.sunset;
    // Band backdrop: deep ink wash so the title reads on any photo.
    var bg = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
    bg.addColorStop(0, 'rgba(10,7,20,0.92)');
    bg.addColorStop(1, 'rgba(10,7,20,0.78)');
    ctx.fillStyle = bg;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(band.x, band.y + band.h - 3, band.w, 3);

    var cx = band.x + band.w / 2;
    var subPx = Math.round(tpx * 0.24);
    var tagPx = Math.round(tpx * 0.21);
    var titleY = band.y + band.h * 0.55;
    var subY = titleY - tpx * 0.82;
    var tagY = titleY + tpx * 0.66;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = Math.round(subPx * 0.42) + 'px';
    ctx.fillStyle = '#ffd166';
    ctx.font = '700 ' + subPx + 'px system-ui, sans-serif';
    ctx.fillText((state.subtitle || '').toUpperCase(), cx, subY);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';

    // Gradient title with optional outline + shadow.
    var tg = ctx.createLinearGradient(cx - tpx * 3, 0, cx + tpx * 3, 0);
    tg.addColorStop(0, '#ffd166');
    tg.addColorStop(0.45, '#ff2e88');
    tg.addColorStop(1, '#ff8a2a');
    ctx.font = tpx + 'px Anton, "Arial Narrow", sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = state.shadowPx || 0;
    ctx.shadowOffsetY = Math.round((state.shadowPx || 0) / 3);
    if (state.outline) {
      ctx.lineWidth = Math.max(1, state.outlinePx || 0);
      ctx.strokeStyle = '#12081f';
      ctx.lineJoin = 'round';
      ctx.strokeText(state.title || '', cx, titleY);
    }
    ctx.fillStyle = tg;
    ctx.fillText(state.title || '', cx, titleY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = 'rgba(244,238,252,0.92)';
    ctx.font = 'italic 400 ' + tagPx + 'px Georgia, serif';
    ctx.fillText(state.tagline || '', cx, tagY);

    if (state.layout === 'magazine') {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd166';
      ctx.font = '700 ' + Math.round(tpx * 0.2) + 'px system-ui, sans-serif';
      ctx.fillText('ISSUE 01 \u2014 LEONIDA', band.x + band.w - 24, subY);
    }
    ctx.restore();
  }

  function drawFurniture(ctx, state, w, h) {
    var fh = furnitureH(h);
    var y0 = h - fh;
    var grade = GRADES[state.grade] || GRADES.sunset;
    ctx.fillStyle = '#0a0714';
    ctx.fillRect(0, y0, w, fh);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(0, y0, w, 2);

    // Quote bar, left — shrunk until it clears the centred billing block
    // (at 1080 px wide the full-size quote ran into it: "TIMESA LEONIDA").
    ctx.save();
    var bPx = Math.max(9, Math.round(fh * 0.15));
    ctx.font = '400 ' + bPx + 'px system-ui, sans-serif';
    var bW = Math.max(
      ctx.measureText('A LEONIDA PICTURE  \u2022  STARRING THE DUO  \u2022  MUSIC BY OCEAN DRIVE').width,
      ctx.measureText('\u00A9 2026 VICE HEAT STUDIO  \u2022  ALL PHOTOS FREELY LICENSED').width);
    var qLimit = w / 2 - bW / 2 - 28;
    var qPx = Math.round(fh * 0.24);
    ctx.font = 'italic 400 ' + qPx + 'px Georgia, serif';
    while (qPx > 9 && 22 + ctx.measureText(state.quote || '').width > qLimit) {
      qPx -= 1;
      ctx.font = 'italic 400 ' + qPx + 'px Georgia, serif';
    }
    ctx.fillStyle = 'rgba(244,238,252,0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.quote || '', 22, y0 + fh * 0.32);
    // Billing block, centre, tiny.
    ctx.fillStyle = 'rgba(183,168,214,0.95)';
    ctx.font = '400 ' + bPx + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A LEONIDA PICTURE  \u2022  STARRING THE DUO  \u2022  MUSIC BY OCEAN DRIVE', w / 2, y0 + fh * 0.30);
    ctx.fillText('\u00A9 2026 VICE HEAT STUDIO  \u2022  ALL PHOTOS FREELY LICENSED', w / 2, y0 + fh * 0.58);
    // Star strip, right of centre.
    ctx.fillStyle = '#ffc93c';
    ctx.font = Math.round(fh * 0.26) + 'px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('\u2605\u2605\u2605\u2605\u2605', w - 130, y0 + fh * 0.32);
    ctx.fillStyle = 'rgba(244,238,252,0.9)';
    ctx.font = '700 ' + Math.round(fh * 0.16) + 'px system-ui, sans-serif';
    ctx.fillText('LEONIDA', w - 130, y0 + fh * 0.62);
    ctx.restore();

    // Seal: a stamped circle in the furniture strip, radius 34.
    var scx = w - 52, scy = y0 + fh / 2, r = 34;
    ctx.save();
    ctx.beginPath();
    ctx.arc(scx, scy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2e88';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffd166';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(scx, scy, r - 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,209,102,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('LEONIDA', scx, scy - 8);
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText('\u2605', scx, scy + 6);
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.fillText('EST. 2026', scx, scy + 19);
    ctx.restore();
  }

  function drawCallouts(ctx, state, w, h) {
    if (state.layout !== 'grid9' && state.layout !== 'single') return;
    var zone = panelZone(state, w, h);
    var cells = cellsFor(state.layout, zone);
    var hero = null;
    cells.forEach(function (c) { if (c.heroDuo) hero = c; });
    if (!hero) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var px = Math.round(clamp(w * 0.016, 13, 22));
    ctx.font = '700 ' + px + 'px system-ui, sans-serif';
    // "WANTED" pill, tilted, at the hero's top-right corner — sized to its
    // text (the old fixed 104 px pill was narrower than "WANTED: HEAT", so
    // the tail of the word spilled onto the next panel and vanished) and
    // kept fully inside the hero cell.
    var wanted = 'WANTED: HEAT';
    var wTw = ctx.measureText(wanted).width;
    var wPw = Math.ceil(wTw) + 28;
    ctx.translate(hero.x + hero.w - wPw / 2 - 12, hero.y + 28);
    ctx.rotate(-0.10);
    ctx.fillStyle = '#ffc93c';
    rr(ctx, -wPw / 2, -14, wPw, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#12081f';
    ctx.fillText(wanted, 0, 1);
    ctx.restore();
    // "100% LEONIDA" pill — sized to its text and parked above the role
    // chip with a gap (the old fixed 116 px pill was narrower than its text
    // and its bottom edge overlapped the THE DUO chip).
    ctx.save();
    ctx.font = '700 ' + Math.round(px * 0.85) + 'px system-ui, sans-serif';
    var pct = '100% LEONIDA';
    var pTw = ctx.measureText(pct).width;
    var pPw = Math.ceil(pTw) + 28;
    var chipH = Math.round(clamp(w * 0.026, 22, 36));
    ctx.translate(hero.x + pPw / 2 + 10, hero.y + hero.h - chipH - 10 - 13 - 8);
    ctx.rotate(0.1);
    ctx.fillStyle = 'rgba(10,8,18,0.85)';
    rr(ctx, -pPw / 2, -13, pPw, 26, 13);
    ctx.fill();
    ctx.strokeStyle = '#37e0d8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#37e0d8';
    ctx.fillText(pct, 0, 1);
    ctx.restore();
  }

  function drawSpine(ctx, state, w, h) {
    if (state.layout !== 'magazine') return;
    var zone = panelZone(state, w, h);
    var cells = cellsFor('magazine', zone);
    var hero = cells[0];
    ctx.save();
    ctx.fillStyle = 'rgba(10,7,20,0.85)';
    ctx.fillRect(hero.x, hero.y, 26, hero.h);
    ctx.translate(hero.x + 13, hero.y + hero.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#ffd166';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L E O N I D A', 0, 0);
    ctx.restore();
  }

  // --- hit test --------------------------------------------------------------
  function panelAt(state, px, py, w, h) {
    var zone = panelZone(state, w, h);
    var cells = cellsFor(state.layout, zone);
    for (var i = cells.length - 1; i >= 0; i--) {
      var c = cells[i];
      if (c.ghost) continue;
      if (c.shear) {
        var t = (py - c.y) / Math.max(1, c.h);
        var shift = c.shear * (1 - 2 * t);
        if (px >= c.x - shift && px <= c.x + c.w - shift && py >= c.y && py <= c.y + c.h) return c.panel;
      } else if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) {
        return c.panel;
      }
    }
    return -1;
  }

  // --- main render -----------------------------------------------------------
  function renderCover(canvas, state, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var zone = panelZone(state, w, h);
    var grade = GRADES[state.grade] || GRADES.sunset;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d0b16';
    ctx.fillRect(0, 0, w, h);

    var cells = cellsFor(state.layout, zone);
    cells.forEach(function (cell, idx) {
      var panel = state.panels[cell.panel];
      var img = panel ? photo(panel.src, opts.onReady) : null;
      if (img && img.complete && img.naturalWidth > 0) {
        drawPhoto(ctx, img, cell, panel, zone);
      } else {
        placeholder(ctx, cell, panel ? panel.tag : '', (idx * 47 + 315) % 360);
      }
      // Thin frame between panels.
      ctx.save();
      ctx.strokeStyle = 'rgba(13,11,22,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cell.x + 1, cell.y + 1, cell.w - 2, cell.h - 2);
      ctx.restore();
    });

    // Grade wash over the photo zone only.
    var amt = clamp((state.intensity == null ? 80 : state.intensity) / 100, 0, 1);
    if (amt > 0) {
      ctx.save();
      ctx.globalCompositeOperation = grade.blend;
      ctx.globalAlpha = grade.alpha * amt;
      var g = ctx.createLinearGradient(zone.x, zone.y, zone.x, zone.y + zone.h);
      g.addColorStop(0, grade.top);
      g.addColorStop(1, grade.bottom);
      ctx.fillStyle = g;
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      ctx.restore();
      // Vignette to hold the edges together.
      ctx.save();
      var v = ctx.createRadialGradient(w / 2, zone.y + zone.h / 2, Math.min(w, zone.h) * 0.35, w / 2, zone.y + zone.h / 2, Math.max(w, zone.h) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,' + (0.28 * amt).toFixed(3) + ')');
      ctx.fillStyle = v;
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      ctx.restore();
    }

    drawTitleBand(ctx, state, w, h);
    drawSpine(ctx, state, w, h);
    drawFurniture(ctx, state, w, h);
    drawCallouts(ctx, state, w, h);
    drawChips(ctx, state, w, h); // chips LAST — nothing may cover them
  }

  window.ViceHeat = {
    GRADES: GRADES,
    GRADE_IDS: GRADE_IDS,
    LAYOUTS: LAYOUTS,
    LAYOUT_IDS: LAYOUT_IDS,
    TITLES: TITLES,
    defaultState: defaultState,
    titleBand: titleBand,
    panelZone: panelZone,
    cellsFor: cellsFor,
    getChipRects: getChipRects,
    panelAt: panelAt,
    renderCover: renderCover,
    preload: preload
  };
})();
