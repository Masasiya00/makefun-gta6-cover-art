// VICE HEAT — editor: controls, drag crop/zoom, role-tag renaming, export.
//
// FIX 1 (blank screenshots): applyShotParams NEVER hides the editor with an
// inline style. In shot mode it only adds the `shot-mode` class (CSS hides
// the chrome) and sizes the preview to the runner viewport BEFORE fitStage,
// so the canvas bitmap is exactly the shot size. In editor mode no class is
// added and every control stays visible.
//
// FIX 2 (role-tag rename never opened): the chip rectangles come from ONE
// place — ViceHeat.getChipRects in cover.js. main.js keeps no second copy of
// the formula, and the click hit-test uses the LIVE scale from
// canvas.getBoundingClientRect() at click time, never a stored previewScale.
(function () {
  'use strict';

  var VH = window.ViceHeat;
  var $ = function (id) { return document.getElementById(id); };

  var state = VH.defaultState();
  var selected = 0;
  var canvas = $('stage');
  var wrap = $('stage-wrap');
  var tagEditor = $('tag-editor');

  // --- render + fit ----------------------------------------------------------
  function render() {
    VH.renderCover(canvas, state, { onReady: render });
    syncPanelUI();
  }

  function fitStage() {
    // Canvas bitmap = preview size (1280x720 in the editor; the runner
    // viewport in shot mode). CSS scales it into the stage column.
    canvas.width = state.previewW;
    canvas.height = state.previewH;
    render();
  }

  // --- shot params (?shot=cover|editor&layout=..&grade=..&title=..) ---------
  function applyShotParams() {
    var q = new URLSearchParams(window.location.search);
    var shot = q.get('shot');
    var layout = q.get('layout');
    var grade = q.get('grade');
    if (layout && VH.LAYOUTS[layout]) state.layout = layout;
    if (grade && VH.GRADES[grade]) state.grade = grade;
    if (q.get('title')) state.title = q.get('title');
    if (q.get('subtitle')) state.subtitle = q.get('subtitle');
    if (q.get('tagline')) state.tagline = q.get('tagline');
    if (q.get('intensity') !== null) state.intensity = Math.max(0, Math.min(100, parseInt(q.get('intensity'), 10) || 0));
    if (q.get('titlepos')) state.titlePos = q.get('titlepos');
    if (shot === 'cover') {
      // Cover shot: chrome off via class, bitmap = viewport, 1:1.
      document.body.classList.add('shot-mode');
      state.previewW = window.innerWidth;
      state.previewH = window.innerHeight;
    }
    // shot === 'editor': deliberately NO shot-mode class — controls stay.
    syncControls();
    fitStage();
  }

  // --- controls ---------------------------------------------------------------
  function buildPills() {
    var lp = $('layout-pills');
    VH.LAYOUT_IDS.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = VH.LAYOUTS[id].name;
      b.dataset.layout = id;
      b.addEventListener('click', function () {
        state.layout = id;
        if (selected >= VH.LAYOUTS[id].panels) selected = 0;
        buildPanelSelect();
        syncControls();
        render();
      });
      lp.appendChild(b);
    });
    var gp = $('grade-pills');
    VH.GRADE_IDS.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = VH.GRADES[id].name;
      b.dataset.grade = id;
      b.addEventListener('click', function () {
        state.grade = id;
        syncControls();
        render();
      });
      gp.appendChild(b);
    });
  }

  function buildPanelSelect() {
    var sel = $('in-panel');
    sel.innerHTML = '';
    var n = VH.LAYOUTS[state.layout].panels;
    for (var i = 0; i < n; i++) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = 'Panel ' + (i + 1) + ' — ' + (state.panels[i].tag || '');
      sel.appendChild(o);
    }
    sel.value = String(selected);
  }

  function syncControls() {
    document.querySelectorAll('#layout-pills button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.layout === state.layout);
    });
    document.querySelectorAll('#grade-pills button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.grade === state.grade);
    });
    $('in-title').value = state.title;
    $('in-subtitle').value = state.subtitle;
    $('in-tagline').value = state.tagline;
    $('in-quote').value = state.quote;
    $('in-titlepos').value = state.titlePos;
    $('in-outline').checked = !!state.outline;
    $('in-outline-px').value = String(state.outlinePx);
    $('out-outline-px').textContent = state.outlinePx + ' px';
    $('in-shadow').value = String(state.shadowPx);
    $('out-shadow').textContent = state.shadowPx + ' px';
    $('in-intensity').value = String(state.intensity);
    $('out-intensity').textContent = state.intensity + '%';
    buildPanelSelect();
  }

  function syncPanelUI() {
    var panel = state.panels[selected];
    if (!panel) return;
    var sel = $('in-panel');
    if (sel.value !== String(selected)) sel.value = String(selected);
    if (document.activeElement !== $('in-tag')) $('in-tag').value = panel.tag || '';
    $('in-zoom').value = String(Math.round(panel.zoom * 100));
    $('out-zoom').textContent = panel.zoom.toFixed(2) + '\u00D7';
    $('panel-hint').textContent = 'Panel ' + (selected + 1) + ' of ' +
      VH.LAYOUTS[state.layout].panels + ' \u2014 ' + (panel.tag || '');
  }

  function bindControls() {
    $('in-title').addEventListener('input', function (e) { state.title = e.target.value; render(); });
    $('in-subtitle').addEventListener('input', function (e) { state.subtitle = e.target.value; render(); });
    $('in-tagline').addEventListener('input', function (e) { state.tagline = e.target.value; render(); });
    $('in-quote').addEventListener('input', function (e) { state.quote = e.target.value; render(); });
    $('in-titlepos').addEventListener('change', function (e) { state.titlePos = e.target.value; render(); });
    $('in-outline').addEventListener('change', function (e) { state.outline = e.target.checked; render(); });
    $('in-outline-px').addEventListener('input', function (e) {
      state.outlinePx = parseInt(e.target.value, 10);
      $('out-outline-px').textContent = state.outlinePx + ' px';
      render();
    });
    $('in-shadow').addEventListener('input', function (e) {
      state.shadowPx = parseInt(e.target.value, 10);
      $('out-shadow').textContent = state.shadowPx + ' px';
      render();
    });
    $('in-intensity').addEventListener('input', function (e) {
      state.intensity = parseInt(e.target.value, 10);
      $('out-intensity').textContent = state.intensity + '%';
      render();
    });
    $('in-panel').addEventListener('change', function (e) {
      selected = parseInt(e.target.value, 10) || 0;
      render();
    });
    $('in-tag').addEventListener('change', function (e) {
      state.panels[selected].tag = e.target.value.trim() || state.panels[selected].tag;
      buildPanelSelect();
      render();
    });
    $('in-zoom').addEventListener('input', function (e) {
      state.panels[selected].zoom = Math.max(1, Math.min(3, parseInt(e.target.value, 10) / 100));
      render();
    });
    $('btn-upload').addEventListener('click', function () { $('file-upload').click(); });
    $('file-upload').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var url = URL.createObjectURL(file);
      var panel = state.panels[selected];
      panel.src = url;
      panel.ox = 0; panel.oy = 0; panel.zoom = 1;
      VH.preload(state).then(render);
      render();
      e.target.value = '';
    });
    document.querySelectorAll('[data-export]').forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.dataset.export.split('x');
        exportPNG(parseInt(parts[0], 10), parseInt(parts[1], 10));
      });
    });
    $('btn-export').addEventListener('click', function () { exportPNG(1080, 1080); });
    $('btn-export-all').addEventListener('click', exportAll);
    $('btn-shuffle').addEventListener('click', shuffle);
    $('btn-reset').addEventListener('click', resetAll);
  }

  // --- shuffle / reset ---------------------------------------------------------
  function shuffleArray(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function shuffle() {
    var srcs = state.panels.map(function (p) { return p.src; });
    shuffleArray(srcs);
    state.panels.forEach(function (p, i) { p.src = srcs[i]; p.ox = 0; p.oy = 0; p.zoom = 1; });
    state.grade = VH.GRADE_IDS[Math.floor(Math.random() * VH.GRADE_IDS.length)];
    state.title = VH.TITLES[Math.floor(Math.random() * VH.TITLES.length)];
    VH.preload(state).then(render);
    syncControls();
    render();
  }
  function resetAll() {
    var keepW = state.previewW, keepH = state.previewH;
    state = VH.defaultState();
    state.previewW = keepW;
    state.previewH = keepH;
    selected = 0;
    hideTagEditor();
    VH.preload(state).then(render);
    syncControls();
    render();
  }

  // --- export ------------------------------------------------------------------
  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function exportPNG(w, h) {
    return VH.preload(state).then(function () {
      var off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      VH.renderCover(off, state, {});
      return new Promise(function (resolve) {
        off.toBlob(function (blob) {
          if (blob) download(blob, 'vice-heat-' + w + 'x' + h + '.png');
          resolve(!!blob);
        }, 'image/png');
      });
    });
  }
  function exportAll() {
    var sizes = [[1080, 1080], [1080, 1350], [1920, 1080], [1080, 1920]];
    var chain = Promise.resolve();
    sizes.forEach(function (s, i) {
      chain = chain.then(function () {
        return new Promise(function (r) { setTimeout(r, i === 0 ? 0 : 350); });
      }).then(function () { return exportPNG(s[0], s[1]); });
    });
    return chain;
  }

  // --- role-tag editor (FIX 2) --------------------------------------------------
  // Hit-test against the chips cover.js actually drew — the one source of
  // truth — with the scale measured live from the canvas box at click time.
  function chipAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var sx = rect.width / canvas.width;
    var sy = rect.height / canvas.height;
    var cx = (clientX - rect.left) / sx;
    var cy = (clientY - rect.top) / sy;
    var chips = VH.getChipRects(state, canvas.width, canvas.height);
    for (var i = 0; i < chips.length; i++) {
      var c = chips[i];
      if (cx >= c.x && cx <= c.x + c.w && cy >= c.y && cy <= c.y + c.h) {
        return { chip: c, rect: rect, sx: sx, sy: sy };
      }
    }
    return null;
  }

  function openTagEditor(hit) {
    var c = hit.chip;
    selected = c.panel;
    tagEditor.value = c.tag;
    tagEditor.hidden = false;
    // Position over the chip in screen pixels (live scale, same as hit-test).
    tagEditor.style.left = (c.x * hit.sx) + 'px';
    tagEditor.style.top = (c.y * hit.sy - 2) + 'px';
    tagEditor.style.width = Math.max(90, c.w * hit.sx + 30) + 'px';
    tagEditor.style.height = Math.max(24, c.h * hit.sy) + 'px';
    tagEditor.style.maxWidth = '340px';
    // Focus on the next tick: focusing synchronously inside the pointerdown
    // handler loses — the mousedown default then moves focus to the canvas
    // (not focusable, so body), the input blurs, and the blur handler hides
    // the editor 2 ms after it opened. Deferring focus past the default
    // action makes the rename editor actually stay open.
    setTimeout(function () { tagEditor.focus(); tagEditor.select(); }, 0);
    syncPanelUI();
  }
  function hideTagEditor() { tagEditor.hidden = true; }

  tagEditor.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var v = tagEditor.value.trim();
      if (v) {
        state.panels[selected].tag = v.toUpperCase();
        buildPanelSelect();
      }
      hideTagEditor();
      render();
    } else if (e.key === 'Escape') {
      hideTagEditor();
    }
    e.stopPropagation();
  });
  tagEditor.addEventListener('blur', function () { hideTagEditor(); });
  // Escape anywhere closes the floating tag editor (its own keydown only
  // fires while the input has focus).
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !tagEditor.hidden) hideTagEditor();
  });

  // --- drag crop / zoom on the canvas -------------------------------------------
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    var hit = chipAt(e.clientX, e.clientY);
    if (hit) { openTagEditor(hit); return; }
    hideTagEditor();
    var rect = canvas.getBoundingClientRect();
    var sx = rect.width / canvas.width;
    var sy = rect.height / canvas.height;
    var px = (e.clientX - rect.left) / sx;
    var py = (e.clientY - rect.top) / sy;
    var panel = VH.panelAt(state, px, py, canvas.width, canvas.height);
    if (panel < 0) return;
    selected = panel;
    drag = { panel: panel, x: e.clientX, y: e.clientY, ox: state.panels[panel].ox, oy: state.panels[panel].oy };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
    render();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var rect = canvas.getBoundingClientRect();
    var sx = rect.width / canvas.width;
    var panel = state.panels[drag.panel];
    // Drag in canvas pixels, converted to the -1..1 pan fraction by cell size.
    var zone = VH.panelZone(state, canvas.width, canvas.height);
    var cells = VH.cellsFor(state.layout, zone);
    var cell = null;
    cells.forEach(function (c) { if (c.panel === drag.panel && !c.ghost) cell = c; });
    if (!cell) return;
    var dx = (e.clientX - drag.x) / sx;
    var dy = (e.clientY - drag.y) / (rect.height / canvas.height);
    panel.ox = Math.max(-1, Math.min(1, drag.ox - dx / Math.max(40, cell.w / 2)));
    panel.oy = Math.max(-1, Math.min(1, drag.oy - dy / Math.max(40, cell.h / 2)));
    render();
  });
  function endDrag() {
    drag = null;
    canvas.classList.remove('dragging');
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var sx = rect.width / canvas.width;
    var sy = rect.height / canvas.height;
    var panel = VH.panelAt(state, (e.clientX - rect.left) / sx, (e.clientY - rect.top) / sy, canvas.width, canvas.height);
    if (panel < 0) return;
    selected = panel;
    var p = state.panels[panel];
    p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    render();
  }, { passive: false });

  // --- boot ----------------------------------------------------------------------
  buildPills();
  bindControls();
  if (document.fonts && document.fonts.load) {
    document.fonts.load('16px Anton').catch(function () {});
  }
  VH.preload(state).then(render);
  applyShotParams();
  window.addEventListener('resize', function () {
    if (!document.body.classList.contains('shot-mode')) fitStage();
  });
  window.ViceHeatEditor = { get state() { return state; }, render: render, exportPNG: exportPNG, exportAll: exportAll };
})();
