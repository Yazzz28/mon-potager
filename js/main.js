import { App } from './state.js';
import { Storage } from './storage.js';
import { Utils } from './utils.js';
import { DB } from './db.js';
import { navigateTo } from './navigation.js';
import { handleAddPlant, updateDatePredictions, prefillForm, resetAddForm, showPlantPreview } from './renders/form.js';
import { renderMyGarden } from './renders/garden.js';
import { renderCalendar } from './renders/calendar.js';
import { renderLibrary } from './renders/library.js';
import { closePlantDetailModal } from './renders/detail.js';
import { exportBackup, importBackup } from './backup.js';
import { showToast } from './toast.js';
import { initTerrain } from './renders/terrain.js';

async function init() {
  // Load DB
  try {
    const res = await fetch('./data.json');
    App.db = await res.json();
  } catch (err) {
    console.error('Erreur chargement data.json:', err);
    showToast('Impossible de charger la base de données.', 'error');
    return;
  }

  // Load user plants
  App.plants = Storage.load();

  // Load terrain
  initTerrain();

  // Init date
  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Season label
  const m = Utils.currentMonth();
  const seasons = { 1:'Hiver ❄️', 2:'Hiver ❄️', 3:'Printemps 🌸', 4:'Printemps 🌸', 5:'Printemps 🌸',
                    6:'Été ☀️', 7:'Été ☀️', 8:'Été ☀️', 9:'Automne 🍂', 10:'Automne 🍂',
                    11:'Automne 🍂', 12:'Hiver ❄️' };
  document.getElementById('season-label').textContent = seasons[m] || '';

  // Populate stage filter in My Garden
  const stageFilter = document.getElementById('filter-stage');
  App.db.stages.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.emoji} ${s.name}`;
    stageFilter.appendChild(opt);
  });

  // ---- EVENT LISTENERS ----

  // Nav items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // Hamburger
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Quick add button
  document.getElementById('quick-add-btn').addEventListener('click', () => navigateTo('ajouter'));

  // Add form
  document.getElementById('add-plant-form').addEventListener('submit', handleAddPlant);
  document.getElementById('cancel-form-btn').addEventListener('click', () => navigateTo('monpotager'));

  // Delegate buttons with data-page
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (btn && !btn.classList.contains('nav-item')) {
      navigateTo(btn.dataset.page);
    }
  });

  // Plant search in add form
  const plantSearchInput = document.getElementById('plant-search-input');
  const dropdown = document.getElementById('plant-dropdown');

  plantSearchInput.addEventListener('input', Utils.debounce(() => {
    const q = plantSearchInput.value.trim();
    if (q.length < 1) { dropdown.classList.add('hidden'); return; }
    const results = DB.searchPlants(q);
    if (results.length === 0) { dropdown.classList.add('hidden'); return; }
    dropdown.innerHTML = results.slice(0, 10).map(p => `
      <div class="plant-dropdown-item" data-id="${p.id}">
        <span class="item-emoji">${p.emoji}</span>
        <div>
          <span class="item-name">${p.name}</span>
          <div class="item-type">${p.family} — ${Utils.capitalize(p.type)}</div>
        </div>
      </div>
    `).join('');
    dropdown.classList.remove('hidden');
  }, 180));

  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.plant-dropdown-item');
    if (!item) return;
    const dbPlant = DB.getPlant(item.dataset.id);
    plantSearchInput.value = dbPlant.name;
    document.getElementById('selected-plant-id').value = dbPlant.id;
    dropdown.classList.add('hidden');
    showPlantPreview(dbPlant);
    updateDatePredictions();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.plant-search-wrapper')) {
      dropdown.classList.add('hidden');
    }
  });

  // Stage/date change → update predictions
  document.getElementById('plant-stage').addEventListener('change', updateDatePredictions);
  document.getElementById('plant-date').addEventListener('change', updateDatePredictions);

  // My garden filters
  document.getElementById('search-plants').addEventListener('input', Utils.debounce(() => renderMyGarden(), 200));
  document.getElementById('filter-stage').addEventListener('change', () => renderMyGarden());
  document.getElementById('filter-type').addEventListener('change', () => renderMyGarden());
  document.getElementById('sort-btn').addEventListener('click', () => {
    const modes = ['date-desc', 'date-asc', 'name'];
    const idx = modes.indexOf(App.sortMode);
    App.sortMode = modes[(idx + 1) % modes.length];
    const labels = { 'date-desc': '⇅ Plus récent', 'date-asc': '⇅ Plus ancien', 'name': '⇅ A-Z' };
    document.getElementById('sort-btn').textContent = labels[App.sortMode];
    renderMyGarden();
  });

  // Calendar nav
  document.getElementById('cal-prev').addEventListener('click', () => {
    App.calendarDate.setMonth(App.calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    App.calendarDate.setMonth(App.calendarDate.getMonth() + 1);
    renderCalendar();
  });

  // Library search
  const libSearch = document.getElementById('lib-search');
  libSearch.addEventListener('input', Utils.debounce(() => renderLibrary(libSearch.value), 200));
  document.getElementById('lib-filter-type').addEventListener('change', () => renderLibrary(libSearch.value));

  // Backup
  document.getElementById('export-btn').addEventListener('click', exportBackup);
  document.getElementById('import-input').addEventListener('change', (e) => {
    importBackup(e.target.files[0]);
    e.target.value = ''; // reset so same file can be re-imported
  });

  // Modals
  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('plant-modal').classList.add('hidden');
  });
  document.getElementById('modal-backdrop').addEventListener('click', () => {
    document.getElementById('plant-modal').classList.add('hidden');
  });
  document.getElementById('plant-detail-close').addEventListener('click', closePlantDetailModal);
  document.getElementById('plant-detail-backdrop').addEventListener('click', closePlantDetailModal);

  // Initial render
  navigateTo('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
