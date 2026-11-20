// VICE HEAT: Leonida Cover Studio — editor (app/src/main.js).
//
// Wires the page in app/index.html to the renderer in cover.js: the control
// column on the left (layout, grade, title style, photos, export), the live
// preview canvas, per-panel upload + drag crop + wheel zoom, editable role
// tags (click a chip, type, Enter to save), Shuffle, Reset and one-click
// export at the four post sizes. Runs fully offline; photos never leave the
// machine. A ?shot= query (see shots.js) drives fixed screenshot scenes.

import { GRADES, GRADE_KEYS, LAYOUTS, LAYOUT_KEYS, TITLES, defaultState, renderCover, SAMPLE_PHOTOS } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);

const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
  { label: '1080 × 1920', w: 1080, h: 1920 },
];

const state = defaultState();
let selectedPanel = 4; // the duo starts selected
let lastRects = [];
let previewScale = 1;
let dragStart = null;
let editingChip = null;

const canvas = $('cover');
const ctx = canvas.getContext('2d');

function loadSample(key) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `samples/${key}.jpg`;
  });
}

async function loadAllSamples() {
  const loaded = await Promise.all(state.panels.map((p) => loadSample(p.photo)));
  loaded.forEach((img, i) => {
    state.panels[i].img = img;
  });
}

function drawPreview() {
  // The preview canvas is square-ish at 960px internally and CSS-scaled;
  // exports re-render at their real size, so the preview never limits them.
  if (canvas.width !== 960) canvas.width = 960;
  if (canvas.height !== 960) canvas.height = 960;
  const result = renderCover(ctx, state, canvas.width, canvas.height);
  lastRects = result.rects;
  previewScale = canvas.width / canvas.clientWidth;
  drawSelection();
}

function drawSelection() {
  if (selectedPanel === null || selectedPanel === undefined) return;
  const rect = lastRects.find((r) => r.panelIndex === selectedPanel);
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 8]);
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.setLineDash([]);
  ctx.restore();
}

function syncControls() {
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('taglineInput').value = state.tagline;
  $('quoteInput').value = state.quote;
  $('intensity').value = state.intensity;
  $('intensityVal').textContent = `${state.intensity}%`;
  document.querySelectorAll('[data-titlepos]').forEach((b) => b.classList.toggle('active', b.dataset.titlepos === state.titlePos));
  $('outlineToggle').checked = state.outline;
  $('outlineWidth').value = state.outlineWidth;
  $('outlineWidthVal').textContent = `${state.outlineWidth}px`;
  $('shadowRange').value = state.shadow;
  $('shadowVal').textContent = `${state.shadow}px`;
  const panel = state.panels[selectedPanel];
  $('panelLabel').textContent = panel ? `Panel ${selectedPanel + 1} — ${panel.role}` : 'No panel selected';
  $('zoomRange').value = panel ? Math.round(panel.zoom * 100) : 100;
  $('zoomVal').textContent = panel ? `${Math.round(panel.zoom * 100)}%` : '—';
}

function buildPickers() {
  const layoutRow = $('layoutRow');
  LAYOUT_KEYS.forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.textContent = LAYOUTS[key].label;
    b.addEventListener('click', () => {
      state.layout = key;
      syncControls();
      drawPreview();
    });
    layoutRow.appendChild(b);
  });
  const gradeRow = $('gradeRow');
  GRADE_KEYS.forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = key;
    b.classList.add('swatch');
    b.style.setProperty('--g1', GRADES[key].title[0]);
    b.style.setProperty('--g2', GRADES[key].title[1]);
    b.style.setProperty('--g3', GRADES[key].title[2]);
    b.textContent = GRADES[key].label;
    b.addEventListener('click', () => {
      state.grade = key;
      syncControls();
      drawPreview();
    });
    gradeRow.appendChild(b);
  });
  const exportRow = $('exportRow');
  EXPORT_SIZES.forEach((size) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.classList.add('export-btn');
    b.textContent = `PNG ${size.label}`;
    b.addEventListener('click', () => exportCover(size));
    exportRow.appendChild(b);
  });
}

function bindControls() {
  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value.toUpperCase().slice(0, 24) || 'VICE HEAT';
    drawPreview();
  });
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value.slice(0, 24);
    drawPreview();
  });
  $('taglineInput').addEventListener('input', (e) => {
    state.tagline = e.target.value.slice(0, 80);
    drawPreview();
  });
  $('quoteInput').addEventListener('input', (e) => {
    state.quote = e.target.value.slice(0, 80);
    drawPreview();
  });
  $('intensity').addEventListener('input', (e) => {
    state.intensity = Number(e.target.value);
    $('intensityVal').textContent = `${state.intensity}%`;
    drawPreview();
  });
  document.querySelectorAll('[data-titlepos]').forEach((b) => {
    b.addEventListener('click', () => {
      state.titlePos = b.dataset.titlepos;
      syncControls();
      drawPreview();
    });
  });
  $('outlineToggle').addEventListener('change', (e) => {
    state.outline = e.target.checked;
    drawPreview();
  });
  $('outlineWidth').addEventListener('input', (e) => {
    state.outlineWidth = Number(e.target.value);
    $('outlineWidthVal').textContent = `${state.outlineWidth}px`;
    drawPreview();
  });
  $('shadowRange').addEventListener('input', (e) => {
    state.shadow = Number(e.target.value);
    $('shadowVal').textContent = `${state.shadow}px`;
    drawPreview();
  });
  $('zoomRange').addEventListener('input', (e) => {
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    panel.zoom = Number(e.target.value) / 100;
    $('zoomVal').textContent = `${e.target.value}%`;
    drawPreview();
  });
  $('shuffleBtn').addEventListener('click', () => {
    const keys = SAMPLE_PHOTOS.map((p) => p.key);
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    state.panels.forEach((panel, i) => {
      panel.photo = keys[i % keys.length];
      panel.img = null;
      panel.zoom = 1;
      panel.cx = 0.5;
      panel.cy = 0.5;
    });
    state.grade = GRADE_KEYS[Math.floor(Math.random() * GRADE_KEYS.length)];
    state.title = TITLES[Math.floor(Math.random() * TITLES.length)];
    state.intensity = 60 + Math.floor(Math.random() * 41);
    loadAllSamples().then(() => {
      syncControls();
      drawPreview();
      setStatus('Shuffled photos, grade and title.');
    });
  });
  $('resetBtn').addEventListener('click', () => {
    const fresh = defaultState();
    Object.assign(state, fresh);
    selectedPanel = 4;
    loadAllSamples().then(() => {
      syncControls();
      drawPreview();
      setStatus('Reset to the VICE HEAT defaults.');
    });
  });
  $('photoFile').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      panel.img = img;
      panel.photo = 'upload';
      panel.zoom = 1;
      panel.cx = 0.5;
      panel.cy = 0.5;
      URL.revokeObjectURL(url);
      drawPreview();
      setStatus(`Photo loaded into panel ${selectedPanel + 1}. Drag to crop, scroll to zoom.`);
    };
    img.onerror = () => setStatus('That file could not be read as a photo.');
    img.src = url;
    e.target.value = '';
  });
}

function canvasPoint(event) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - r.left) * (canvas.width / r.width),
    y: (event.clientY - r.top) * (canvas.height / r.height),
  };
}

function hitPanel(point) {
  for (let i = lastRects.length - 1; i >= 0; i--) {
    const r = lastRects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return r;
  }
  return null;
}

function chipHit(point) {
  // Chips sit at the bottom-left of their panel; a click near one opens
  // the floating role editor instead of selecting the panel.
  const hit = hitPanel(point);
  if (!hit) return null;
  const chipZone = { x: hit.x, y: hit.y + hit.h - 46, w: Math.min(hit.w * 0.6, 220), h: 46 };
  if (point.x >= chipZone.x && point.x <= chipZone.x + chipZone.w && point.y >= chipZone.y && point.y <= chipZone.y + chipZone.h) {
    return hit;
  }
  return null;
}

function openRoleEditor(rect) {
  closeRoleEditor(true);
  const panel = state.panels[rect.panelIndex];
  if (!panel) return;
  const input = document.createElement('input');
  input.id = 'roleEditor';
  input.maxLength = 14;
  input.value = panel.role;
  input.setAttribute('aria-label', 'Edit role tag');
  const box = canvas.getBoundingClientRect();
  const scaleX = box.width / canvas.width;
  const scaleY = box.height / canvas.height;
  input.style.left = `${box.left + (rect.x + 8) * scaleX + window.scrollX}px`;
  input.style.top = `${box.top + (rect.y + rect.h - 40) * scaleY + window.scrollY}px`;
  input.style.width = `${Math.max(90, rect.w * 0.45 * scaleX)}px`;
  document.body.appendChild(input);
  input.focus();
  input.select();
  editingChip = { input, panelIndex: rect.panelIndex };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      closeRoleEditor(true);
    } else if (e.key === 'Escape') {
      closeRoleEditor(false);
    }
    e.stopPropagation();
  });
  input.addEventListener('blur', () => closeRoleEditor(true));
}

function closeRoleEditor(save) {
  if (!editingChip) return;
  const { input, panelIndex } = editingChip;
  // Clear the handle first: removing a focused input fires blur, and the
  // blur handler calls this again — it must be a no-op the second time.
  editingChip = null;
  if (save) {
    const value = input.value.trim().toUpperCase().slice(0, 14);
    if (value) state.panels[panelIndex].role = value;
  }
  input.remove();
  drawPreview();
  syncControls();
}

function bindCanvas() {
  canvas.addEventListener('pointerdown', (e) => {
    const point = canvasPoint(e);
    const chip = chipHit(point);
    if (chip) {
      // Prevent the mousedown default: it would move focus to <body> (the
      // canvas is not focusable) and instantly blur the editor we just
      // opened, closing it before the user can type.
      e.preventDefault();
      openRoleEditor(chip);
      return;
    }
    const hit = hitPanel(point);
    if (!hit) return;
    selectedPanel = hit.panelIndex;
    syncControls();
    drawPreview();
    const panel = state.panels[selectedPanel];
    dragStart = { x: e.clientX, y: e.clientY, cx: panel.cx, cy: panel.cy, zoom: panel.zoom, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragStart) return;
    const panel = state.panels[selectedPanel];
    if (!panel || !panel.img) return;
    const rect = lastRects.find((r) => r.panelIndex === selectedPanel);
    if (!rect) return;
    const box = canvas.getBoundingClientRect();
    const dxPx = (e.clientX - dragStart.x) * (canvas.width / box.width);
    const dyPx = (e.clientY - dragStart.y) * (canvas.height / box.height);
    const base = Math.max(rect.w / panel.img.naturalWidth, rect.h / panel.img.naturalHeight);
    const dw = panel.img.naturalWidth * base * panel.zoom;
    const dh = panel.img.naturalHeight * base * panel.zoom;
    if (dw > rect.w) panel.cx = Math.max(0, Math.min(1, dragStart.cx - dxPx / (dw - rect.w)));
    if (dh > rect.h) panel.cy = Math.max(0, Math.min(1, dragStart.cy - dyPx / (dh - rect.h)));
    if (Math.abs(e.clientX - dragStart.x) + Math.abs(e.clientY - dragStart.y) > 3) dragStart.moved = true;
    drawPreview();
  });
  const endDrag = () => {
    dragStart = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    const next = panel.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12);
    panel.zoom = Math.max(1, Math.min(4, next));
    syncControls();
    drawPreview();
  }, { passive: false });
  canvas.addEventListener('dblclick', (e) => {
    const hit = hitPanel(canvasPoint(e));
    if (hit) $('photoFile').click();
  });
}

function exportCover(size) {
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  const offCtx = off.getContext('2d');
  renderCover(offCtx, state, size.w, size.h);
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed: the canvas could not be written.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-heat-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Exported PNG ${size.w} × ${size.h}.`);
  }, 'image/png');
}

function setStatus(text) {
  const el = $('status');
  if (el) el.textContent = text;
}

async function init() {
  buildPickers();
  bindControls();
  bindCanvas();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  await loadAllSamples();
  // Wait until the vendored Anton font is really usable for canvas text,
  // not just until fonts.ready settles: a cover rendered while Anton is
  // still in flight falls back to Arial Black, whose cap height is much
  // shorter, so the baseline computed from the fallback metrics clips the
  // tops of the real Anton caps. Poll the load until check() says yes.
  if (document.fonts) {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      try {
        await document.fonts.load('80px Anton', 'VICE HEAT');
      } catch {
        break;
      }
      if (document.fonts.check('80px Anton')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  syncControls();
  if (shot) {
    await runShot(shot, params, state, { drawPreview, loadSample });
    // A shot scene changes the state after the first sync, so the controls
    // must be re-synced: otherwise the editor screenshot shows the Sunset
    // defaults while the cover itself renders Ocean Drive.
    syncControls();
  } else {
    drawPreview();
  }
  window.__viceHeat = { state, drawPreview, exportCover };
}

document.addEventListener('DOMContentLoaded', () => {
  document.fonts?.load('80px Anton').catch(() => {});
  init().catch((err) => {
    console.error(err);
    setStatus('The studio could not start. Reload the page to try again.');
  });
});
