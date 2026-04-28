import { App } from '../state.js';
import { DB } from '../db.js';
import { Utils } from '../utils.js';
import { TerrainStorage } from '../terrain-storage.js';
import { showToast } from '../toast.js';

// ============================================================
// INIT
// ============================================================

export function initTerrain() {
  const saved = TerrainStorage.load();
  if (saved && Array.isArray(saved.cells) && saved.cells.length > 0) {
    App.terrain.width  = saved.width  || 10;
    App.terrain.height = saved.height || 8;
    App.terrain.cells  = saved.cells;
  } else {
    App.terrain.cells = _emptyCells(App.terrain.width, App.terrain.height);
  }
}

function _emptyCells(w, h) {
  return Array.from({ length: w * h }, () => ({ type: 'empty', planting: null }));
}

function _save() {
  TerrainStorage.save({
    width:  App.terrain.width,
    height: App.terrain.height,
    cells:  App.terrain.cells,
  });
}

// ============================================================
// MAIN RENDER
// ============================================================

export function renderTerrain() {
  const page = document.getElementById('page-terrain');
  page.innerHTML = _buildPageHTML();
  _attachEvents();
  _renderGrid();
  _renderPalette('');
  if (App.terrain.viewMode === 'timeline') _renderTimeline();
}

function _buildPageHTML() {
  const isPlan = App.terrain.viewMode === 'plan';
  return `
    <div class="page-header">
      <h1>🗺️ Mon Terrain</h1>
      <p class="subtitle">Dessinez votre potager et organisez vos cultures dans l'espace et dans le temps.</p>
    </div>

    <div class="tr-tabs">
      <button class="tr-tab ${isPlan ? 'active' : ''}" data-tab="plan">✏️ Plan du terrain</button>
      <button class="tr-tab ${!isPlan ? 'active' : ''}" data-tab="timeline">📅 Calendrier des cultures</button>
    </div>

    <!-- Plan tab -->
    <div id="tr-panel-plan" class="tr-panel ${isPlan ? '' : 'hidden'}">
      ${_buildToolbarHTML()}
      <div class="tr-main">
        <div class="tr-grid-wrap">
          <div class="tr-grid" id="tr-grid"
               style="--tr-cols:${App.terrain.width};--tr-rows:${App.terrain.height}">
          </div>
        </div>
        <div class="tr-side">
          <div id="tr-cell-detail" class="tr-cell-detail hidden"></div>
          <div class="tr-palette">
            <div class="tr-palette-header">
              <h3>🌿 Plantes disponibles</h3>
              <input type="text" id="tr-palette-search" class="tr-palette-search" placeholder="Rechercher une plante…">
            </div>
            <div class="tr-palette-list" id="tr-palette-list"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Timeline tab -->
    <div id="tr-panel-timeline" class="tr-panel ${!isPlan ? '' : 'hidden'}">
      ${_buildTimelineHTML()}
    </div>
  `;
}

function _buildToolbarHTML() {
  const tools = [
    { id: 'soil',   label: '🌱 Sol' },
    { id: 'path',   label: '🪨 Allée' },
    { id: 'eraser', label: '⬜ Vide' },
    { id: 'select', label: '👆 Sélect.' },
  ];
  return `
    <div class="tr-toolbar">
      <div class="tr-tool-group">
        ${tools.map(t => `
          <button class="tr-tool-btn ${App.terrain.activeTool === t.id ? 'active' : ''}"
                  data-tool="${t.id}">${t.label}</button>
        `).join('')}
      </div>
      <div class="tr-tool-group">
        <span class="tr-tool-label">Taille :</span>
        <input type="number" id="tr-w-input" class="tr-num-input" min="3" max="20" value="${App.terrain.width}">
        <span class="tr-tool-label">×</span>
        <input type="number" id="tr-h-input" class="tr-num-input" min="3" max="20" value="${App.terrain.height}">
        <button class="btn btn-sm btn-outline" id="tr-resize-btn">↔ Resize</button>
      </div>
      <div class="tr-tool-group tr-tool-group--right">
        <button class="btn btn-sm btn-outline" id="tr-clear-btn">🗑️ Tout effacer</button>
      </div>
    </div>
  `;
}

function _buildTimelineHTML() {
  const d     = App.terrain.timelineDate;
  const month = d.getMonth();
  const year  = d.getFullYear();
  return `
    <div class="tr-tl-nav">
      <button class="btn btn-outline btn-sm" id="tr-tl-prev">◀ Préc.</button>
      <h2 class="tr-tl-title" id="tr-tl-title">${Utils.monthName(month)} ${year}</h2>
      <button class="btn btn-outline btn-sm" id="tr-tl-next">Suiv. ▶</button>
    </div>
    <div class="tr-tl-legend">
      <span class="tr-legend-chip tr-stage-semis_interieur">🌱 Semis</span>
      <span class="tr-legend-chip tr-stage-germination">🌿 Germination</span>
      <span class="tr-legend-chip tr-stage-repiquage">🌾 Repiquage</span>
      <span class="tr-legend-chip tr-stage-croissance">🌳 Croissance</span>
      <span class="tr-legend-chip tr-stage-floraison">🌸 Floraison</span>
      <span class="tr-legend-chip tr-stage-fructification">🍅 Fructification</span>
      <span class="tr-legend-chip tr-stage-recolte">🧺 Récolte</span>
    </div>
    <div class="tr-grid-wrap">
      <div class="tr-grid" id="tr-tl-grid"
           style="--tr-cols:${App.terrain.width};--tr-rows:${App.terrain.height}">
      </div>
    </div>
    <div id="tr-tl-plants" class="tr-tl-plants"></div>
  `;
}

// ============================================================
// GRID
// ============================================================

function _renderGrid() {
  const grid = document.getElementById('tr-grid');
  if (!grid) return;
  grid.style.setProperty('--tr-cols', App.terrain.width);
  grid.style.setProperty('--tr-rows', App.terrain.height);
  grid.innerHTML = App.terrain.cells.map((cell, i) => _cellHTML(cell, i)).join('');
}

function _cellHTML(cell, index) {
  const col   = index % App.terrain.width;
  const row   = Math.floor(index / App.terrain.width);
  const label = `${String.fromCharCode(65 + col)}${row + 1}`;
  const selCls = App.terrain.selectedCell === index ? ' tr-selected' : '';

  let inner = `<span class="tr-cell-label">${label}</span>`;
  if (cell.type === 'soil' && cell.planting) {
    const p = DB.getPlant(cell.planting.plantId);
    inner += `<span class="tr-cell-emoji" title="${p?.name || ''}">${p?.emoji || '🌱'}</span>`;
  }
  return `<div class="tr-cell tr-cell--${cell.type}${selCls}" data-i="${index}">${inner}</div>`;
}

// Efficient single-cell DOM update (avoids full grid re-render)
function _patchCell(index) {
  const el = document.querySelector(`#tr-grid [data-i="${index}"]`);
  if (!el) return;
  const cell  = App.terrain.cells[index];
  const col   = index % App.terrain.width;
  const row   = Math.floor(index / App.terrain.width);
  const label = `${String.fromCharCode(65 + col)}${row + 1}`;
  const selCls = App.terrain.selectedCell === index ? ' tr-selected' : '';

  el.className = `tr-cell tr-cell--${cell.type}${selCls}`;
  let inner = `<span class="tr-cell-label">${label}</span>`;
  if (cell.type === 'soil' && cell.planting) {
    const p = DB.getPlant(cell.planting.plantId);
    inner += `<span class="tr-cell-emoji">${p?.emoji || '🌱'}</span>`;
  }
  el.innerHTML = inner;
}

// ============================================================
// GRID EVENTS (attached once per renderTerrain call)
// ============================================================

function _attachGridEvents() {
  const grid = document.getElementById('tr-grid');
  if (!grid) return;

  let painting = false;

  grid.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const cell = e.target.closest('.tr-cell');
    if (!cell) return;
    painting = true;
    const i = parseInt(cell.dataset.i);

    if (App.terrain.activeTool === 'select') {
      // If a palette item is selected, place it
      if (App.terrain._pendingPlantId && App.terrain.cells[i]?.type === 'soil') {
        _placePlant(i, App.terrain._pendingPlantId);
        App.terrain._pendingPlantId = null;
        document.querySelectorAll('.tr-palette-item').forEach(el => el.classList.remove('tr-palette-selected'));
      } else {
        _selectCell(i);
      }
      return;
    }
    _paintCell(i);
  });

  grid.addEventListener('mouseover', (e) => {
    if (!painting || App.terrain.activeTool === 'select') return;
    const cell = e.target.closest('.tr-cell');
    if (cell) _paintCell(parseInt(cell.dataset.i));
  });

  // Stop painting on mouseup anywhere
  document.addEventListener('mouseup', () => { painting = false; });

  // Drag & drop
  grid.addEventListener('dragover', (e) => {
    const cell = e.target.closest('.tr-cell');
    if (!cell) return;
    if (App.terrain.cells[parseInt(cell.dataset.i)]?.type === 'soil') {
      e.preventDefault();
      cell.classList.add('tr-drop-hover');
    }
  });

  grid.addEventListener('dragleave', (e) => {
    e.target.closest('.tr-cell')?.classList.remove('tr-drop-hover');
  });

  grid.addEventListener('drop', (e) => {
    e.preventDefault();
    const cell = e.target.closest('.tr-cell');
    if (!cell) return;
    cell.classList.remove('tr-drop-hover');
    const i = parseInt(cell.dataset.i);
    if (App.terrain.cells[i]?.type !== 'soil') return;
    const plantId = e.dataTransfer.getData('plant-id');
    if (plantId) _placePlant(i, plantId);
  });
}

function _paintCell(index) {
  const tool    = App.terrain.activeTool;
  const newType = tool === 'soil' ? 'soil' : tool === 'path' ? 'path' : 'empty';
  const prev    = App.terrain.cells[index];

  if (prev.type === newType && !prev.planting) return; // no-op
  App.terrain.cells[index] = { type: newType, planting: null };
  _save();
  _patchCell(index);

  if (App.terrain.selectedCell === index) {
    App.terrain.selectedCell = null;
    document.getElementById('tr-cell-detail')?.classList.add('hidden');
  }
}

function _selectCell(index) {
  document.querySelectorAll('#tr-grid .tr-selected').forEach(el => el.classList.remove('tr-selected'));
  document.querySelector(`#tr-grid [data-i="${index}"]`)?.classList.add('tr-selected');
  App.terrain.selectedCell = index;
  _showCellDetail(index);
}

function _showCellDetail(index) {
  const panel = document.getElementById('tr-cell-detail');
  if (!panel) return;
  const cell  = App.terrain.cells[index];
  const col   = index % App.terrain.width;
  const row   = Math.floor(index / App.terrain.width);
  const label = `${String.fromCharCode(65 + col)}${row + 1}`;

  if (cell.type !== 'soil') {
    panel.innerHTML = `
      <div class="tr-detail-head">
        <strong>Case ${label}</strong>
        <span class="badge">${cell.type === 'path' ? '🪨 Allée' : '⬜ Vide'}</span>
      </div>`;
    panel.classList.remove('hidden');
    return;
  }

  if (!cell.planting) {
    panel.innerHTML = `
      <div class="tr-detail-head"><strong>Case ${label} — Sol</strong></div>
      <p class="tr-detail-hint">Glissez une plante depuis la palette, ou sélectionnez une plante puis cliquez sur cette case.</p>`;
    panel.classList.remove('hidden');
    return;
  }

  const { plantId, plantedYear, plantedMonth } = cell.planting;
  const dbPlant    = DB.getPlant(plantId);
  const monthVal   = `${plantedYear}-${String(plantedMonth).padStart(2, '0')}`;
  const plantedLbl = Utils.formatDate(`${plantedYear}-${String(plantedMonth).padStart(2, '0')}-01`);

  panel.innerHTML = `
    <div class="tr-detail-head">
      <span class="tr-detail-emoji">${dbPlant?.emoji || '🌱'}</span>
      <div>
        <strong>${dbPlant?.name || plantId}</strong>
        <small>Case ${label} — Planté ${plantedLbl}</small>
      </div>
    </div>
    <div class="tr-detail-actions">
      <button class="btn btn-sm btn-outline" id="tr-change-date">📅 Changer date</button>
      <button class="btn btn-sm btn-danger"  id="tr-remove-plant">🗑️ Retirer</button>
    </div>
    <div id="tr-date-picker" class="tr-date-picker hidden">
      <label>Mois de plantation :
        <input type="month" id="tr-month-input" value="${monthVal}">
      </label>
      <button class="btn btn-sm btn-primary" id="tr-save-date">✓ OK</button>
    </div>`;
  panel.classList.remove('hidden');

  document.getElementById('tr-remove-plant').addEventListener('click', () => {
    App.terrain.cells[index].planting = null;
    _save();
    App.terrain.selectedCell = null;
    _patchCell(index);
    panel.classList.add('hidden');
  });

  document.getElementById('tr-change-date').addEventListener('click', () => {
    document.getElementById('tr-date-picker').classList.toggle('hidden');
  });

  document.getElementById('tr-save-date').addEventListener('click', () => {
    const v = document.getElementById('tr-month-input').value;
    if (!v) return;
    const [yr, mo] = v.split('-').map(Number);
    App.terrain.cells[index].planting.plantedYear  = yr;
    App.terrain.cells[index].planting.plantedMonth = mo;
    _save();
    showToast('Date mise à jour ✅', 'success');
    _showCellDetail(index);
  });
}

function _placePlant(index, plantId) {
  const today = new Date();
  App.terrain.cells[index].planting = {
    plantId,
    plantedYear:  today.getFullYear(),
    plantedMonth: today.getMonth() + 1,
  };
  _save();
  // Switch to select tool
  App.terrain.activeTool = 'select';
  document.querySelectorAll('.tr-tool-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tool === 'select')
  );
  _patchCell(index);
  _selectCell(index);
}

// ============================================================
// PALETTE
// ============================================================

function _renderPalette(query) {
  const list = document.getElementById('tr-palette-list');
  if (!list) return;

  let plants = App.db.vegetables;
  if (query) {
    const q = query.toLowerCase();
    plants = plants.filter(p =>
      p.name.toLowerCase().includes(q) || p.family.toLowerCase().includes(q)
    );
  }

  list.innerHTML = plants.map(p => `
    <div class="tr-palette-item" draggable="true" data-plant-id="${p.id}">
      <span class="tr-palette-emoji">${p.emoji}</span>
      <span>${p.name}</span>
    </div>
  `).join('');

  list.querySelectorAll('.tr-palette-item').forEach(item => {
    // Drag
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('plant-id', item.dataset.plantId);
      item.classList.add('tr-dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('tr-dragging'));

    // Click to select → then click on cell places plant
    item.addEventListener('click', () => {
      list.querySelectorAll('.tr-palette-item').forEach(i => i.classList.remove('tr-palette-selected'));
      item.classList.add('tr-palette-selected');
      App.terrain._pendingPlantId = item.dataset.plantId;
      // Auto-switch to select tool
      App.terrain.activeTool = 'select';
      document.querySelectorAll('.tr-tool-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tool === 'select')
      );
    });
  });
}

// ============================================================
// TIMELINE
// ============================================================

function _renderTimeline() {
  const d     = App.terrain.timelineDate;
  const month = d.getMonth() + 1; // 1-based
  const year  = d.getFullYear();

  const titleEl = document.getElementById('tr-tl-title');
  if (titleEl) titleEl.textContent = `${Utils.monthName(month - 1)} ${year}`;

  const grid = document.getElementById('tr-tl-grid');
  if (!grid) return;

  grid.style.setProperty('--tr-cols', App.terrain.width);
  grid.style.setProperty('--tr-rows', App.terrain.height);

  const midMonth = new Date(year, month - 1, 15);

  grid.innerHTML = App.terrain.cells.map((cell, i) => {
    const col   = i % App.terrain.width;
    const row   = Math.floor(i / App.terrain.width);
    const label = `${String.fromCharCode(65 + col)}${row + 1}`;

    if (cell.type === 'empty') {
      return `<div class="tr-cell tr-cell--empty" data-i="${i}"><span class="tr-cell-label">${label}</span></div>`;
    }
    if (cell.type === 'path') {
      return `<div class="tr-cell tr-cell--path" data-i="${i}"><span class="tr-cell-label">${label}</span></div>`;
    }
    if (!cell.planting) {
      return `<div class="tr-cell tr-cell--soil" data-i="${i}"><span class="tr-cell-label">${label}</span></div>`;
    }

    const stage     = _stageForDate(cell.planting, midMonth);
    const dbPlant   = DB.getPlant(cell.planting.plantId);
    const stageData = stage ? DB.getStage(stage) : null;
    const stageCls  = stage ? ` tr-stage-${stage}` : '';
    const titleTip  = dbPlant
      ? `${dbPlant.name} — ${stageData?.name || (stage || 'Pas encore planté')}`
      : '';

    return `
      <div class="tr-cell tr-cell--soil${stageCls}" data-i="${i}" title="${titleTip}">
        <span class="tr-cell-label">${label}</span>
        ${dbPlant   ? `<span class="tr-cell-emoji">${dbPlant.emoji}</span>` : ''}
        ${stageData ? `<span class="tr-cell-stage-icon">${stageData.emoji}</span>` : ''}
      </div>`;
  }).join('');

  _renderTimelinePlants(year, month, midMonth);
}

function _stageForDate(planting, targetDate) {
  const planted = new Date(planting.plantedYear, planting.plantedMonth - 1, 1);
  const days    = Math.floor((targetDate - planted) / 86400000);
  if (days < 0) return null;

  const db = DB.getPlant(planting.plantId);
  if (!db) return null;

  const germMin      = db.germination_days?.min || 7;
  const germMax      = db.germination_days?.max || 21;
  const hasTransplant = !!db.transplant;
  const tpDays       = hasTransplant ? 35 : 0;
  const hvMin        = db.harvest?.days_from_transplant?.min || 60;
  const hvMax        = db.harvest?.days_from_transplant?.max || 90;

  if (days < germMin)                                           return 'semis_interieur';
  if (days < germMax)                                           return 'germination';
  if (hasTransplant && days < germMax + tpDays)                 return 'repiquage';
  if (days < germMax + tpDays + Math.round(hvMin * 0.65))       return 'croissance';
  if (days < germMax + tpDays + hvMin)                          return 'floraison';
  if (days < germMax + tpDays + hvMax)                          return 'fructification';
  if (days < germMax + tpDays + hvMax + 21)                     return 'recolte';
  return 'termine';
}

function _renderTimelinePlants(year, month, midMonth) {
  const listEl = document.getElementById('tr-tl-plants');
  if (!listEl) return;

  const stageOrder = [
    'semis_interieur', 'semis_exterieur', 'germination', 'repiquage',
    'croissance', 'floraison', 'fructification', 'recolte',
  ];
  const grouped = {};

  App.terrain.cells.forEach((cell, i) => {
    if (cell.type !== 'soil' || !cell.planting) return;
    const stage = _stageForDate(cell.planting, midMonth);
    if (!stage || stage === 'termine') return;
    const col   = i % App.terrain.width;
    const row   = Math.floor(i / App.terrain.width);
    const label = `${String.fromCharCode(65 + col)}${row + 1}`;
    const dbPlant = DB.getPlant(cell.planting.plantId);
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push({ label, dbPlant });
  });

  const keys = stageOrder.filter(s => grouped[s]);
  if (keys.length === 0) {
    listEl.innerHTML = '<p class="empty-state">Aucune culture active ce mois-ci. Placez des plantes sur votre terrain pour voir les prévisions.</p>';
    return;
  }

  listEl.innerHTML = keys.map(s => {
    const sd = DB.getStage(s);
    return `
      <div class="tr-month-group">
        <h4 class="tr-month-title">${sd?.emoji || ''} ${sd?.name || s}</h4>
        <div class="tr-month-items">
          ${grouped[s].map(item => `
            <div class="tr-month-item">
              <span>${item.dbPlant?.emoji || '🌱'}</span>
              <span>${item.dbPlant?.name || item.dbPlant?.id}</span>
              <span class="tr-cell-ref">${item.label}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// RESIZE
// ============================================================

function _resizeTerrain(newW, newH) {
  const old  = App.terrain.cells;
  const oldW = App.terrain.width;
  const oldH = App.terrain.height;
  const cells = [];
  for (let r = 0; r < newH; r++) {
    for (let c = 0; c < newW; c++) {
      cells.push(
        r < oldH && c < oldW
          ? old[r * oldW + c]
          : { type: 'empty', planting: null }
      );
    }
  }
  App.terrain.width        = newW;
  App.terrain.height       = newH;
  App.terrain.cells        = cells;
  App.terrain.selectedCell = null;
  _save();
  _renderGrid();
  document.getElementById('tr-cell-detail')?.classList.add('hidden');
}

// ============================================================
// EVENT BINDINGS (called once per renderTerrain)
// ============================================================

function _attachEvents() {
  // --- Tabs ---
  document.querySelectorAll('.tr-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.tab;
      App.terrain.viewMode = mode;
      document.querySelectorAll('.tr-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === mode)
      );
      document.getElementById('tr-panel-plan').classList.toggle('hidden', mode !== 'plan');
      document.getElementById('tr-panel-timeline').classList.toggle('hidden', mode !== 'timeline');
      if (mode === 'plan') { _renderGrid(); _renderPalette(''); }
      else _renderTimeline();
    });
  });

  // --- Drawing tools ---
  document.querySelectorAll('.tr-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      App.terrain.activeTool = btn.dataset.tool;
      document.querySelectorAll('.tr-tool-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tool === btn.dataset.tool)
      );
      if (btn.dataset.tool !== 'select') {
        App.terrain._pendingPlantId = null;
        document.querySelectorAll('.tr-palette-item').forEach(i =>
          i.classList.remove('tr-palette-selected')
        );
      }
    });
  });

  // --- Grid interactions ---
  _attachGridEvents();

  // --- Resize ---
  document.getElementById('tr-resize-btn')?.addEventListener('click', () => {
    const w = parseInt(document.getElementById('tr-w-input').value);
    const h = parseInt(document.getElementById('tr-h-input').value);
    if (w >= 3 && w <= 20 && h >= 3 && h <= 20) _resizeTerrain(w, h);
    else showToast('Taille invalide (3–20 lignes/colonnes).', 'error');
  });

  // --- Clear ---
  document.getElementById('tr-clear-btn')?.addEventListener('click', () => {
    if (!confirm('Effacer tout le terrain et toutes les plantes placées ?')) return;
    App.terrain.cells        = _emptyCells(App.terrain.width, App.terrain.height);
    App.terrain.selectedCell = null;
    _save();
    _renderGrid();
    document.getElementById('tr-cell-detail')?.classList.add('hidden');
    showToast('Terrain effacé.', '');
  });

  // --- Palette search ---
  document.getElementById('tr-palette-search')?.addEventListener('input',
    Utils.debounce(() => {
      const v = document.getElementById('tr-palette-search')?.value || '';
      _renderPalette(v.trim());
    }, 200)
  );

  // --- Timeline navigation ---
  document.getElementById('tr-tl-prev')?.addEventListener('click', () => {
    App.terrain.timelineDate.setMonth(App.terrain.timelineDate.getMonth() - 1);
    _renderTimeline();
  });
  document.getElementById('tr-tl-next')?.addEventListener('click', () => {
    App.terrain.timelineDate.setMonth(App.terrain.timelineDate.getMonth() + 1);
    _renderTimeline();
  });
}
