import { App } from '../state.js';
import { DB } from '../db.js';
import { Utils } from '../utils.js';
import { Predictions } from '../predictions.js';
import { navigateTo } from '../navigation.js';
import { openPlantDetail } from './detail.js';
import { deletePlant } from '../mutations.js';

export function renderMyGarden() {
  const grid = document.getElementById('plants-grid');
  let filtered = [...App.plants];

  // Search filter
  const q = document.getElementById('search-plants').value.toLowerCase();
  if (q) {
    filtered = filtered.filter(up => {
      const db = DB.getPlant(up.plantId);
      const name = (up.customName || db?.name || '').toLowerCase();
      const variety = (up.variety || '').toLowerCase();
      return name.includes(q) || variety.includes(q);
    });
  }

  // Stage filter
  const stageFilter = document.getElementById('filter-stage').value;
  if (stageFilter) {
    filtered = filtered.filter(up => up.currentStage === stageFilter);
  }

  // Type filter
  const typeFilter = document.getElementById('filter-type').value;
  if (typeFilter) {
    filtered = filtered.filter(up => {
      const db = DB.getPlant(up.plantId);
      return db?.type === typeFilter;
    });
  }

  // Sort
  if (App.sortMode === 'date-desc') {
    filtered.sort((a, b) => b.stageDate.localeCompare(a.stageDate));
  } else if (App.sortMode === 'date-asc') {
    filtered.sort((a, b) => a.stageDate.localeCompare(b.stageDate));
  } else if (App.sortMode === 'name') {
    filtered.sort((a, b) => {
      const na = a.customName || DB.getPlant(a.plantId)?.name || '';
      const nb = b.customName || DB.getPlant(b.plantId)?.name || '';
      return na.localeCompare(nb);
    });
  }

  if (filtered.length === 0 && App.plants.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-big">
        <div class="empty-icon">🌾</div>
        <h3>Votre potager est vide</h3>
        <p>Ajoutez vos premières plantes pour commencer le suivi !</p>
        <button class="btn btn-primary" id="empty-add-btn">+ Ajouter une plante</button>
      </div>`;
    document.getElementById('empty-add-btn').addEventListener('click', () => navigateTo('ajouter'));
    return;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state-big"><div class="empty-icon">🔍</div><h3>Aucun résultat</h3><p>Essayez d\'autres filtres.</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(up => buildPlantCard(up)).join('');

  grid.querySelectorAll('.plant-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn')) return;
      openPlantDetail(card.dataset.id);
    });
  });

  grid.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePlant(btn.dataset.id);
    });
  });

  grid.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPlantDetail(btn.dataset.id);
    });
  });
}

export function buildPlantCard(up) {
  const dbPlant = DB.getPlant(up.plantId);
  const stage = DB.getStage(up.currentStage);
  const name = up.customName || dbPlant?.name || up.plantId;
  const emoji = dbPlant?.emoji || '🌱';
  const stageColor = stage?.color || '#4CAF50';
  const stageEmoji = stage?.emoji || '🌱';

  // Progress bar: estimate % through lifecycle
  const stageOrder = ['semis_interieur', 'semis_exterieur', 'germination', 'repiquage', 'croissance', 'floraison', 'fructification', 'recolte', 'termine'];
  const stageIndex = stageOrder.indexOf(up.currentStage);
  const progress = Math.round((stageIndex / (stageOrder.length - 1)) * 100);

  // Next prediction
  const preds = Predictions.compute(up);
  const nextPred = preds[0];
  const nextLabel = nextPred
    ? `${nextPred.icon} ${nextPred.label} : ${Utils.formatDateShort(nextPred.dateMin)}`
    : '';

  const daysSince = Utils.daysBetween(up.stageDate, Utils.toInputDate(new Date()));

  return `
    <div class="plant-card" data-id="${up.id}">
      <div class="plant-card-header">
        <span class="plant-emoji">${emoji}</span>
        <div class="plant-card-info">
          <div class="plant-card-name">${name}</div>
          ${up.variety ? `<div class="plant-card-variety">${up.variety}</div>` : ''}
          ${up.quantity > 1 ? `<div class="plant-card-variety">× ${up.quantity}</div>` : ''}
        </div>
        <div class="plant-card-actions">
          <button class="icon-btn edit-btn" data-id="${up.id}" title="Détails">✏️</button>
          <button class="icon-btn delete-btn" data-id="${up.id}" title="Supprimer">🗑️</button>
        </div>
      </div>
      <div class="plant-card-body">
        <div class="stage-badge" style="background:${stageColor}">${stageEmoji} ${stage?.name || up.currentStage}</div>
        <div class="plant-card-meta">
          <span>📅 ${Utils.formatDate(up.stageDate)}</span>
          ${up.location ? `<span>📍 ${up.location}</span>` : ''}
          ${nextLabel ? `<span style="color:var(--color-primary-dark);font-weight:600">${nextLabel}</span>` : ''}
        </div>
        <div class="progress-bar-container" title="${progress}% du cycle">
          <div class="progress-bar" style="width:${progress}%"></div>
        </div>
      </div>
      <div class="plant-card-footer">
        <span>Depuis ${daysSince} jour${daysSince !== 1 ? 's' : ''} à ce stade</span>
        ${up.notes ? `<span title="${up.notes}">📝</span>` : ''}
      </div>
    </div>
  `;
}
