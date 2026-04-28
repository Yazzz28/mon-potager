import { App } from '../state.js';
import { DB } from '../db.js';
import { Utils } from '../utils.js';
import { Predictions } from '../predictions.js';
import { Storage } from '../storage.js';
import { showToast } from '../toast.js';
import { navigateTo } from '../navigation.js';

export function resetAddForm() {
  document.getElementById('add-plant-form').reset();
  document.getElementById('plant-search-input').value = '';
  document.getElementById('selected-plant-id').value = '';
  document.getElementById('plant-preview').classList.add('hidden');
  document.getElementById('date-predictions').classList.add('hidden');
  document.getElementById('plant-dropdown').classList.add('hidden');
  document.getElementById('plant-date').value = Utils.toInputDate(new Date());

  // Populate stage select
  const stageSelect = document.getElementById('plant-stage');
  stageSelect.innerHTML = '<option value="">Choisir un stade</option>' +
    App.db.stages.map(s => `<option value="${s.id}">${s.emoji} ${s.name}</option>`).join('');
}

export function prefillForm(plantId) {
  const dbPlant = DB.getPlant(plantId);
  if (!dbPlant) return;
  document.getElementById('plant-search-input').value = dbPlant.name;
  document.getElementById('selected-plant-id').value = plantId;
  showPlantPreview(dbPlant);
}

export function prefillFormFromPlant(up) {
  prefillForm(up.plantId);
  document.getElementById('plant-name-custom').value = up.customName || '';
  document.getElementById('plant-variety').value = up.variety || '';
  document.getElementById('plant-stage').value = up.currentStage;
  document.getElementById('plant-date').value = up.stageDate;
  document.getElementById('plant-location').value = up.location || '';
  document.getElementById('plant-quantity').value = up.quantity || 1;
  document.getElementById('plant-notes').value = up.notes || '';
  updateDatePredictions();
}

export function showPlantPreview(dbPlant) {
  document.getElementById('preview-emoji').textContent = dbPlant.emoji;
  document.getElementById('preview-name').textContent = dbPlant.name;
  document.getElementById('preview-family').textContent = dbPlant.family;
  document.getElementById('preview-sun').textContent = Utils.capitalize(dbPlant.needs.sun);
  document.getElementById('preview-water').textContent = Utils.capitalize(dbPlant.needs.water);
  document.getElementById('preview-germination').textContent =
    `Germination : ${dbPlant.germination_days.min}-${dbPlant.germination_days.max} jours`;
  document.getElementById('plant-preview').classList.remove('hidden');
}

export function updateDatePredictions() {
  const plantId = document.getElementById('selected-plant-id').value;
  const stage = document.getElementById('plant-stage').value;
  const date = document.getElementById('plant-date').value;
  if (!plantId || !stage || !date) {
    document.getElementById('date-predictions').classList.add('hidden');
    return;
  }
  const fakeUp = { plantId, currentStage: stage, stageDate: date };
  const preds = Predictions.compute(fakeUp);
  if (preds.length === 0) {
    document.getElementById('date-predictions').classList.add('hidden');
    return;
  }
  document.getElementById('predictions-content').innerHTML = preds.map(p => `
    <div class="prediction-item">
      <span>${p.icon}</span>
      <span class="prediction-label">${p.label}</span>
      <span class="prediction-date">${Utils.formatDate(p.dateMin)} — ${Utils.formatDate(p.dateMax)}</span>
    </div>
  `).join('');
  document.getElementById('date-predictions').classList.remove('hidden');
}

export function handleAddPlant(e) {
  e.preventDefault();
  const plantId = document.getElementById('selected-plant-id').value;
  if (!plantId) return showToast('Veuillez choisir une plante.', 'error');
  const stage = document.getElementById('plant-stage').value;
  if (!stage) return showToast('Veuillez choisir un stade.', 'error');
  const date = document.getElementById('plant-date').value;
  if (!date) return showToast('Veuillez entrer une date.', 'error');

  const newPlant = {
    id: Utils.generateId(),
    plantId,
    customName: document.getElementById('plant-name-custom').value.trim(),
    variety: document.getElementById('plant-variety').value.trim(),
    currentStage: stage,
    stageDate: date,
    location: document.getElementById('plant-location').value.trim(),
    quantity: parseInt(document.getElementById('plant-quantity').value) || 1,
    notes: document.getElementById('plant-notes').value.trim(),
    addedAt: Utils.toInputDate(new Date()),
    history: [{ stage, date, note: 'Ajout initial' }]
  };

  App.plants.push(newPlant);
  Storage.save(App.plants);
  showToast(`${DB.getPlant(plantId)?.emoji || '🌱'} Plante ajoutée au potager !`, 'success');
  navigateTo('monpotager');
}
