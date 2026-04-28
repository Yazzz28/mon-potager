import { App } from '../state.js';
import { DB } from '../db.js';
import { Utils } from '../utils.js';
import { Predictions } from '../predictions.js';
import { showToast } from '../toast.js';
import { navigateTo } from '../navigation.js';
import { prefillFormFromPlant } from './form.js';
import { updatePlantStage, deletePlant } from '../mutations.js';

export function openPlantDetail(id) {
  const up = App.plants.find(p => p.id === id);
  if (!up) return;
  const dbPlant = DB.getPlant(up.plantId);
  const stage = DB.getStage(up.currentStage);
  const name = up.customName || dbPlant?.name || up.plantId;

  const preds = Predictions.compute(up);

  const stageOrder = ['semis_interieur', 'semis_exterieur', 'germination', 'repiquage', 'croissance', 'floraison', 'fructification', 'recolte', 'termine'];
  const currentIdx = stageOrder.indexOf(up.currentStage);

  const timelineHtml = stageOrder.map((sId, i) => {
    const s = DB.getStage(sId);
    let dotClass = 'future';
    if (i < currentIdx) dotClass = 'done';
    if (i === currentIdx) dotClass = 'current';
    return `
      <div class="timeline-item">
        <div class="timeline-dot ${dotClass}"></div>
        <div class="timeline-label">
          <strong>${s?.emoji || ''} ${s?.name || sId}</strong>
          ${i === currentIdx ? `<small>Depuis le ${Utils.formatDate(up.stageDate)}</small>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const stageOptions = App.db.stages.map(s =>
    `<option value="${s.id}" ${s.id === up.currentStage ? 'selected' : ''}>${s.emoji} ${s.name}</option>`
  ).join('');

  const predsHtml = preds.length ? preds.map(p => `
    <div class="prediction-item">
      <span>${p.icon}</span>
      <span class="prediction-label">${p.label}</span>
      <span class="prediction-date">${Utils.formatDate(p.dateMin)} — ${Utils.formatDate(p.dateMax)}</span>
    </div>
  `).join('') : '<p style="color:var(--text-light);font-size:14px;padding:8px">Aucune estimation disponible pour ce stade.</p>';

  const body = document.getElementById('plant-detail-body');
  body.innerHTML = `
    <div class="modal-plant-header">
      <span class="modal-plant-emoji">${dbPlant?.emoji || '🌱'}</span>
      <div>
        <div class="modal-plant-name">${name}</div>
        ${up.variety ? `<div style="color:var(--text-secondary);font-style:italic">${up.variety}</div>` : ''}
        ${up.location ? `<div style="font-size:13px;color:var(--text-secondary)">📍 ${up.location}</div>` : ''}
      </div>
    </div>

    <div class="modal-section">
      <h4>🌿 Stade actuel : ${stage?.name || up.currentStage}</h4>
      <div class="stage-timeline">${timelineHtml}</div>
    </div>

    <div class="modal-section">
      <h4>📅 Prédictions</h4>
      <div class="predictions-grid">${predsHtml}</div>
    </div>

    ${up.notes ? `
    <div class="modal-section">
      <h4>📝 Notes</h4>
      <p style="font-size:14px;color:var(--text-secondary);background:#F9FBE7;padding:12px;border-radius:8px">${up.notes}</p>
    </div>` : ''}

    <div class="update-stage-section">
      <h4>Mettre à jour le stade</h4>
      <div class="stage-select-row">
        <select id="detail-stage-select" class="form-input" style="flex:1">${stageOptions}</select>
        <input type="date" id="detail-stage-date" class="form-input" value="${up.stageDate}" style="flex:1" />
        <button class="btn btn-primary btn-sm" id="detail-update-btn">Mettre à jour</button>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" id="detail-edit-btn">✏️ Modifier</button>
        <button class="btn btn-danger btn-sm" id="detail-delete-btn">🗑️ Supprimer</button>
      </div>
    </div>
  `;

  document.getElementById('detail-update-btn').addEventListener('click', () => {
    const newStage = document.getElementById('detail-stage-select').value;
    const newDate = document.getElementById('detail-stage-date').value;
    if (!newStage || !newDate) return showToast('Veuillez choisir un stade et une date.', 'error');
    updatePlantStage(id, newStage, newDate);
    closePlantDetailModal();
  });

  document.getElementById('detail-delete-btn').addEventListener('click', () => {
    closePlantDetailModal();
    deletePlant(id);
  });

  document.getElementById('detail-edit-btn').addEventListener('click', () => {
    closePlantDetailModal();
    // Open edit form (pre-fill & navigate to add page)
    navigateTo('ajouter');
    setTimeout(() => prefillFormFromPlant(up), 200);
  });

  document.getElementById('plant-detail-modal').classList.remove('hidden');
}

export function closePlantDetailModal() {
  document.getElementById('plant-detail-modal').classList.add('hidden');
}
