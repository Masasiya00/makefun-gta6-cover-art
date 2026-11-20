// app/src/main.js — VICE HEAT editor wiring.
// Reads the query params (?mode=cover|editor, layout, grade, intensity,
// role_duo), builds the editor controls, handles crop/zoom/role editing and
// PNG export. The app makes zero network requests: photos are local files
// or user uploads that never leave this machine.

import {
  PHOTOS,
  GRADES,
  LAYOUTS,
  EXPORT_SIZES,
  freshState,
  cloneState,
  gradeById,
  renderCover,
  layoutPanels,
  geometry,
  clampCrop,
  shuffleState,
} from './cover.js';

const canvas = document.getElementById('poster');
const ctx = canvas.getContext('2d');
const DEFAULTS = freshState();
const state = freshState();

const images = {}; // photo id -> HTMLImageElement
const uploadImages = {}; // slot index -> HTMLImageElement
let selectedSlot = 0;
let lastRender = null;
let ready = false;

function params() {
  return new URLSearchParams(window.location.search);
}

function applyParams() {
  const q = params();
  const mode = (q.get('mode') || 'editor').toLowerCase();
  document.body.classList.toggle('mode-cover', mode === 'cover');
  const layout = q.get('layout');
  if (layout && LAYOUTS.includes(layout)) state.layout = layout;
  const grade = q.get('grade');
  if (grade && GRADES.some((g) => g.id === grade)) {
    state.grade = grade;
    state.title = gradeById(grade).title;
  }
  const intensity = q.get('intensity');
  if (intensity !== null && intensity !== '') {
    const n = Number(intensity);
    if (Number.isFinite(n)) state.intensity = Math.max(0, Math.min(100, n));
  }
  const roleDuo = q.get('role_duo');
  if (roleDuo) state.roles.duo = roleDuo.toUpperCase();
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load ' + src));
    img.src = src;
  });
}

async function loadSamples() {
  await Promise.all(
    PHOTOS.map(async (p) => {
      try {
        images[p.id] = await loadImage(p.file);
      } catch (e) {
        console.warn('sample missing:', p.file);
      }
    }),
  );
}

function render() {
  lastRender = renderCover(ctx, state, images, uploadImages, canvas.width, canvas.height);
  syncControls();
  return lastRender;
}

function renderToSize(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const c2 = c.getContext('2d');
  renderCover(c2, state, images, uploadImages, w, h);
  return c;
}

function downloadCanvas(c, filename) {
  return new Promise((resolve) => {
    c.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve();
    }, 'image/png');
  });
}

async function exportSize(w, h) {
  const c = renderToSize(w, h);
  await downloadCanvas(c, `vice-heat-${w}x${h}.png`);
  return { w, h };
}

async function exportAll() {
  for (const [w, h] of EXPORT_SIZES) {
    await exportSize(w, h);
    await new Promise((r) => setTimeout(r, 250));
  }
}

// --- controls ---------------------------------------------------------------
const $ = (id) => document.getElementById(id);

function buildButtons(container, items, current, onPick) {
  const el = $(container);
  el.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill' + (it.id === current ? ' active' : '');
    b.textContent = it.label;
    b.dataset.id = it.id;
    b.addEventListener('click', () => onPick(it.id));
    el.appendChild(b);
  }
}

function syncControls() {
  buildButtons('layoutBtns', LAYOUTS.map((l) => ({ id: l, label: l[0].toUpperCase() + l.slice(1) })), state.layout, setLayout);
  buildButtons(
    'gradeBtns',
    GRADES.map((g) => ({ id: g.id, label: g.name })),
    state.grade,
    setGrade,
  );
  $('intensity').value = String(state.intensity);
  $('intensityVal').textContent = `${state.intensity}%`;
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('taglineInput').value = state.tagline;
  $('quoteInput').value = state.quote;
  $('titlePos').value = state.titlePos;
  $('outlineChk').checked = state.outline;
  $('outlineWidth').value = String(state.outlineWidth);
  $('outlineWidthVal').textContent = `${state.outlineWidth}px`;
  $('shadowRange').value = String(state.shadow);
  $('shadowVal').textContent = `${state.shadow}px`;
  const crop = state.crops[selectedSlot] || { scale: 1 };
  $('zoomRange').value = String(Math.round(crop.scale * 100));
  $('zoomVal').textContent = `${Math.round(crop.scale * 100)}%`;
  $('selectedPanelLabel').textContent = panelLabel(selectedSlot);
  buildPanelList();
}

function panelLabel(slot) {
  const id = state.order[slot];
  const photo = PHOTOS.find((p) => p.id === id);
  return `Panel ${slot + 1} — ${photo ? photo.role : id} (${state.roles[id] || ''})`;
}

function setLayout(id) {
  state.layout = id;
  render();
}

function setGrade(id) {
  state.grade = id;
  state.title = gradeById(id).title; // each grade owns its default title
  render();
}

function buildPanelList() {
  const list = $('panelList');
  if (!list) return;
  if (list.childElementCount === 9) {
    // Rows already exist; just refresh the labels.
    [...list.children].forEach((row, slot) => {
      row.querySelector('.panel-name').textContent = panelLabel(slot);
      row.classList.toggle('selected', slot === selectedSlot);
    });
    return;
  }
  list.innerHTML = '';
  for (let slot = 0; slot < 9; slot++) {
    const row = document.createElement('div');
    row.className = 'panel-row' + (slot === selectedSlot ? ' selected' : '');
    const name = document.createElement('span');
    name.className = 'panel-name';
    name.textContent = panelLabel(slot);
    const up = document.createElement('label');
    up.className = 'upload-btn';
    up.textContent = 'Upload';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    file.addEventListener('change', () => handleUpload(slot, file.files[0]));
    up.appendChild(file);
    row.appendChild(name);
    row.appendChild(up);
    row.addEventListener('click', (e) => {
      if (e.target === file) return;
      selectedSlot = slot;
      render();
    });
    list.appendChild(row);
  }
}

async function handleUpload(slot, file) {
  if (!file) return;
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  state.uploads[slot] = dataUrl;
  uploadImages[slot] = await loadImage(dataUrl);
  state.crops[slot] = { scale: 1, ox: 0, oy: 0 };
  selectedSlot = slot;
  render();
}

function bindControls() {
  $('intensity').addEventListener('input', (e) => {
    state.intensity = Number(e.target.value);
    render();
  });
  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    render();
  });
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    render();
  });
  $('taglineInput').addEventListener('input', (e) => {
    state.tagline = e.target.value;
    render();
  });
  $('quoteInput').addEventListener('input', (e) => {
    state.quote = e.target.value;
    render();
  });
  $('titlePos').addEventListener('change', (e) => {
    state.titlePos = e.target.value;
    render();
  });
  $('outlineChk').addEventListener('change', (e) => {
    state.outline = e.target.checked;
    render();
  });
  $('outlineWidth').addEventListener('input', (e) => {
    state.outlineWidth = Number(e.target.value);
    render();
  });
  $('shadowRange').addEventListener('input', (e) => {
    state.shadow = Number(e.target.value);
    render();
  });
  $('zoomRange').addEventListener('input', (e) => {
    const crop = state.crops[selectedSlot] || { scale: 1, ox: 0, oy: 0 };
    crop.scale = Number(e.target.value) / 100;
    state.crops[selectedSlot] = crop;
    render();
  });
  $('shuffleBtn').addEventListener('click', () => {
    shuffleState(state);
    render();
  });
  $('resetBtn').addEventListener('click', () => {
    const keepUploads = state.uploads;
    const fresh = cloneState(DEFAULTS);
    fresh.uploads = keepUploads;
    Object.assign(state, fresh);
    for (const k of Object.keys(state)) if (!(k in fresh)) delete state[k];
    render();
  });
  $('exportAllBtn').addEventListener('click', exportAll);
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [w, h] = btn.dataset.export.split('x').map(Number);
      exportSize(w, h);
    });
  });
}

// --- canvas interaction: role edit, drag crop, wheel zoom -------------------
const roleEditor = $('roleEditor');

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
    scale: canvas.width / r.width,
  };
}

function chipAt(x, y) {
  if (!lastRender) return null;
  for (const c of lastRender.chips) {
    const r = c.rect;
    if (x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4) return c;
  }
  return null;
}

function openRoleEditor(chip, cssX, cssY) {
  const r = canvas.getBoundingClientRect();
  const k = r.width / canvas.width;
  roleEditor.style.left = `${chip.rect.x * k + 4}px`;
  roleEditor.style.top = `${chip.rect.y * k}px`;
  roleEditor.style.width = `${Math.max(140, chip.rect.w * k + 30)}px`;
  roleEditor.value = chip.text;
  roleEditor.hidden = false;
  roleEditor.focus();
  roleEditor.select();
  roleEditor.dataset.photoId = chip.photoId;
}

function commitRoleEditor() {
  if (roleEditor.hidden) return;
  const v = roleEditor.value.trim().toUpperCase();
  const id = roleEditor.dataset.photoId;
  if (v && id) state.roles[id] = v;
  roleEditor.hidden = true;
  render();
}

let drag = null;

function bindCanvas() {
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);
    const chip = chipAt(p.x, p.y);
    if (chip) {
      // preventDefault stops the mousedown default action (focus steal),
      // which would otherwise blur the editor input the moment it opens
      // and commit+hide it before the user can type.
      e.preventDefault();
      openRoleEditor(chip);
      drag = null;
      return;
    }
    roleEditor.hidden = true;
    const { panels } = layoutPanels(state, canvas.width, canvas.height);
    let hit = null;
    for (const pl of panels) {
      if (pl.kind === 'spine') continue;
      const r = pl.rect;
      const inside =
        pl.kind === 'poly'
          ? pointInPolyLocal(p.x, p.y, pl.poly)
          : p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
      if (inside) {
        hit = pl;
        break;
      }
    }
    if (hit) {
      selectedSlot = hit.slot;
      const crop = state.crops[hit.slot] || { scale: 1, ox: 0, oy: 0 };
      state.crops[hit.slot] = crop;
      drag = { slot: hit.slot, startX: p.x, startY: p.y, ox: crop.ox, oy: crop.oy, moved: false };
      render();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = canvasPoint(e);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    const crop = state.crops[drag.slot];
    crop.ox = drag.ox + dx;
    crop.oy = drag.oy + dy;
    const { panels } = layoutPanels(state, canvas.width, canvas.height);
    const pl = panels.find((x) => x.slot === drag.slot);
    const img = uploadImages[drag.slot] || images[state.order[drag.slot]];
    if (pl && img) state.crops[drag.slot] = clampCrop(pl.rect, img.naturalWidth, img.naturalHeight, crop);
    render();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = canvasPoint(e);
    const { panels } = layoutPanels(state, canvas.width, canvas.height);
    let hit = null;
    for (const pl of panels) {
      if (pl.kind === 'spine') continue;
      const r = pl.rect;
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        hit = pl;
        break;
      }
    }
    if (!hit) return;
    selectedSlot = hit.slot;
    const crop = state.crops[hit.slot] || { scale: 1, ox: 0, oy: 0 };
    crop.scale = Math.max(1, Math.min(3, crop.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    state.crops[hit.slot] = crop;
    render();
  }, { passive: false });
  roleEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commitRoleEditor();
    if (e.key === 'Escape') roleEditor.hidden = true;
    e.stopPropagation();
  });
  roleEditor.addEventListener('blur', commitRoleEditor);
}

function pointInPolyLocal(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// --- boot --------------------------------------------------------------------
async function boot() {
  try {
    applyParams();
    bindControls();
    bindCanvas();
    await loadSamples();
    try {
      await document.fonts.load('40px Anton');
      await document.fonts.ready;
    } catch (e) {
      console.warn('Anton font not ready yet:', e);
    }
    render();
    ready = true;
    window.__cover = {
      state,
      images,
      uploadImages,
      canvas,
      render,
      renderToSize,
      exportSize,
      exportAll,
      layoutPanels: () => layoutPanels(state, canvas.width, canvas.height),
      chips: () => (lastRender ? lastRender.chips : []),
      get ready() {
        return ready;
      },
    };
    window.__coverReady = true;
  } catch (err) {
    console.error(err);
    window.__coverError = String(err);
  }
}

boot();
