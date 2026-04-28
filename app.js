/* ============================================================
   MON POTAGER — app.js
   Application de suivi du potager
   ============================================================ */

'use strict';

// ============================================================
// STATE
// ============================================================
const App = {
  db: null,           // data.json loaded
  plants: [],         // user's plants (from localStorage)
  currentPage: 'dashboard',
  calendarDate: new Date(),
  sortMode: 'date-desc',
};

// ============================================================
// STORAGE
// ============================================================
const Storage = {
  KEY: 'monPotager_plants',
  load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch { return []; }
  },
  save(plants) {
    localStorage.setItem(this.KEY, JSON.stringify(plants));
  }
};

// ============================================================
// UTILS
// ============================================================
const Utils = {
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  },

  toInputDate(date) {
    const d = date instanceof Date ? date : new Date(date + 'T00:00:00');
    return d.toISOString().split('T')[0];
  },

  addDays(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return this.toInputDate(d);
  },

  daysFromNow(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0,0,0,0);
    return Math.round((d - now) / 86400000);
  },

  daysBetween(dateA, dateB) {
    const a = new Date(dateA + 'T00:00:00');
    const b = new Date(dateB + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  },

  capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  },

  monthName(monthIndex) {
    return App.db ? App.db.months[monthIndex] : '';
  },

  currentMonth() {
    return new Date().getMonth() + 1; // 1-based
  },

  debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }
};

// ============================================================
// DATABASE helpers
// ============================================================
const DB = {
  getPlant(id) {
    return App.db.vegetables.find(v => v.id === id);
  },
  getStage(id) {
    return App.db.stages.find(s => s.id === id);
  },
  searchPlants(query) {
    const q = query.toLowerCase();
    return App.db.vegetables.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.family.toLowerCase().includes(q) ||
      v.type.toLowerCase().includes(q) ||
      (v.varieties && v.varieties.some(va => va.toLowerCase().includes(q)))
    );
  },
  getSowableThisMonth() {
    const m = Utils.currentMonth();
    return App.db.vegetables.filter(v => {
      const sow = v.sowing;
      return (sow.indoor && sow.indoor.months.includes(m)) ||
             (sow.outdoor && sow.outdoor.months.includes(m)) ||
             (v.transplant && v.transplant.months.includes(m));
    });
  }
};

// ============================================================
// DATE PREDICTIONS
// ============================================================
const Predictions = {
  /** Given a user plant entry, compute key upcoming dates */
  compute(userPlant) {
    const dbPlant = DB.getPlant(userPlant.plantId);
    if (!dbPlant) return [];

    const stageId = userPlant.currentStage;
    const stageDate = userPlant.stageDate;
    const results = [];

    const germMin = dbPlant.germination_days?.min || 7;
    const germMax = dbPlant.germination_days?.max || 21;

    if (stageId === 'semis_interieur' || stageId === 'semis_exterieur') {
      // predict germination
      results.push({
        icon: '🌿',
        label: 'Germination estimée',
        dateMin: Utils.addDays(stageDate, germMin),
        dateMax: Utils.addDays(stageDate, germMax),
        type: 'germination'
      });

      // predict transplant if indoor sowing
      if (stageId === 'semis_interieur' && dbPlant.transplant) {
        const transplantDays = 35; // ~5 weeks for most plants
        results.push({
          icon: '🌾',
          label: 'Repiquage en pleine terre',
          dateMin: Utils.addDays(stageDate, transplantDays),
          dateMax: Utils.addDays(stageDate, transplantDays + 14),
          type: 'repiquage'
        });
      }

      // predict harvest
      if (dbPlant.harvest?.days_from_transplant) {
        const harvestBase = stageId === 'semis_interieur' ? 35 : 0;
        results.push({
          icon: '🧺',
          label: 'Récolte estimée',
          dateMin: Utils.addDays(stageDate, harvestBase + dbPlant.harvest.days_from_transplant.min),
          dateMax: Utils.addDays(stageDate, harvestBase + dbPlant.harvest.days_from_transplant.max),
          type: 'recolte'
        });
      }
    }

    if (stageId === 'germination') {
      if (dbPlant.transplant) {
        results.push({
          icon: '🌾',
          label: 'Repiquage recommandé',
          dateMin: Utils.addDays(stageDate, 21),
          dateMax: Utils.addDays(stageDate, 35),
          type: 'repiquage'
        });
      }
    }

    if (stageId === 'repiquage' || stageId === 'croissance') {
      if (dbPlant.harvest?.days_from_transplant) {
        results.push({
          icon: '🧺',
          label: 'Récolte estimée',
          dateMin: Utils.addDays(stageDate, dbPlant.harvest.days_from_transplant.min),
          dateMax: Utils.addDays(stageDate, dbPlant.harvest.days_from_transplant.max),
          type: 'recolte'
        });
      }
    }

    return results;
  },

  /** Get all upcoming events across all user plants */
  getAllUpcoming(daysAhead = 60) {
    const events = [];
    const today = Utils.toInputDate(new Date());
    const limit = Utils.addDays(today, daysAhead);

    App.plants.forEach(up => {
      const preds = this.compute(up);
      const dbPlant = DB.getPlant(up.plantId);
      preds.forEach(pred => {
        if (pred.dateMin <= limit) {
          events.push({
            plantId: up.plantId,
            userPlantId: up.id,
            plantName: up.customName || dbPlant?.name || up.plantId,
            emoji: dbPlant?.emoji || '🌱',
            ...pred
          });
        }
      });
    });

    events.sort((a, b) => a.dateMin.localeCompare(b.dateMin));
    return events;
  }
};

// ============================================================
// ALERTS
// ============================================================
const Alerts = {
  compute() {
    const alerts = [];
    const today = Utils.toInputDate(new Date());
    const in7 = Utils.addDays(today, 7);

    App.plants.forEach(up => {
      const dbPlant = DB.getPlant(up.plantId);
      if (!dbPlant) return;
      const name = up.customName || dbPlant.name;

      // Check if harvest is overdue
      if (up.currentStage === 'fructification' || up.currentStage === 'recolte') {
        const daysSince = Utils.daysBetween(up.stageDate, today);
        if (daysSince > 14) {
          alerts.push({
            type: 'warning',
            icon: '🧺',
            title: `${dbPlant.emoji} ${name} — Récolte en attente`,
            text: `Au stade "${up.currentStage}" depuis ${daysSince} jours. Pensez à récolter !`
          });
        }
      }

      // Check if repiquage is upcoming
      const preds = Predictions.compute(up);
      preds.forEach(pred => {
        if (pred.type === 'repiquage' && pred.dateMin <= in7 && pred.dateMin >= today) {
          alerts.push({
            type: 'info',
            icon: '🌾',
            title: `${dbPlant.emoji} ${name} — Repiquage bientôt`,
            text: `Repiquage recommandé vers le ${Utils.formatDate(pred.dateMin)}`
          });
        }
        if (pred.type === 'recolte' && pred.dateMin <= in7 && pred.dateMin >= today) {
          alerts.push({
            type: 'success',
            icon: '🧺',
            title: `${dbPlant.emoji} ${name} — Récolte imminente`,
            text: `Récolte estimée à partir du ${Utils.formatDate(pred.dateMin)}`
          });
        }
      });

      // Check germination expected
      if (up.currentStage === 'semis_interieur' || up.currentStage === 'semis_exterieur') {
        const daysSince = Utils.daysBetween(up.stageDate, today);
        const germMax = dbPlant.germination_days?.max || 21;
        if (daysSince > germMax + 3) {
          alerts.push({
            type: 'danger',
            icon: '⚠️',
            title: `${dbPlant.emoji} ${name} — Germination tardive`,
            text: `Semé il y a ${daysSince} jours, la germination attendue était dans ${germMax} jours max.`
          });
        }
      }
    });

    return alerts;
  }
};

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast hidden'; }, 3200);
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(page) {
  App.currentPage = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard: 'Tableau de bord',
    monpotager: 'Mon Potager',
    ajouter: 'Ajouter une plante',
    calendrier: 'Calendrier',
    bibliotheque: 'Bibliothèque',
    stats: 'Statistiques'
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;

  // Render page content
  if (page === 'dashboard') renderDashboard();
  if (page === 'monpotager') renderMyGarden();
  if (page === 'calendrier') renderCalendar();
  if (page === 'bibliotheque') renderLibrary();
  if (page === 'stats') renderStats();
  if (page === 'ajouter') resetAddForm();

  // Close sidebar on mobile
  if (window.innerWidth < 900) {
    document.getElementById('sidebar').classList.remove('open');
  }

  window.scrollTo(0, 0);
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  // Greeting
  const hour = new Date().getHours();
  let greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  document.getElementById('greeting').textContent = `${greet} ! 🌞`;

  // Stats
  const activePlants = App.plants.filter(p => p.currentStage !== 'termine');
  const harvestReady = App.plants.filter(p => p.currentStage === 'recolte' || p.currentStage === 'fructification');
  const alerts = Alerts.compute();
  const upcoming = Predictions.getAllUpcoming(30);

  document.getElementById('stat-total').textContent = activePlants.length;
  document.getElementById('stat-harvest').textContent = harvestReady.length;
  document.getElementById('stat-alerts').textContent = alerts.length;
  document.getElementById('stat-thismonth').textContent = upcoming.length;

  // Alerts
  const alertsList = document.getElementById('alerts-list');
  if (alerts.length === 0) {
    alertsList.innerHTML = '<p class="empty-state">Aucune alerte pour le moment 🎉</p>';
  } else {
    alertsList.innerHTML = alerts.map(a => `
      <div class="alert-item alert-${a.type}">
        <span class="alert-icon">${a.icon}</span>
        <div class="alert-text">
          <strong>${a.title}</strong>
          <small>${a.text}</small>
        </div>
      </div>
    `).join('');
  }

  // Upcoming
  const upcomingList = document.getElementById('upcoming-list');
  if (upcoming.length === 0) {
    upcomingList.innerHTML = '<p class="empty-state">Ajoutez des plantes pour voir vos prochaines actions.</p>';
  } else {
    upcomingList.innerHTML = upcoming.slice(0, 8).map(ev => {
      const diff = Utils.daysFromNow(ev.dateMin);
      const diffLabel = diff === 0 ? "Aujourd'hui" : diff < 0 ? `Il y a ${-diff}j` : `Dans ${diff}j`;
      return `
        <div class="upcoming-item">
          <span class="upcoming-emoji">${ev.emoji}</span>
          <div class="upcoming-info">
            <strong>${ev.plantName}</strong>
            <small>${ev.label}</small>
          </div>
          <span class="upcoming-date">${diffLabel}</span>
        </div>
      `;
    }).join('');
  }

  // Seasonal suggestions
  const seasonalList = document.getElementById('seasonal-list');
  const sowable = DB.getSowableThisMonth();
  seasonalList.innerHTML = sowable.slice(0, 12).map(p => `
    <div class="seasonal-chip" data-plant-id="${p.id}" title="Ajouter ${p.name}">
      <span class="chip-emoji">${p.emoji}</span>
      <span>${p.name}</span>
    </div>
  `).join('');

  seasonalList.querySelectorAll('.seasonal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      navigateTo('ajouter');
      setTimeout(() => prefillForm(chip.dataset.plantId), 150);
    });
  });
}

// ============================================================
// MY GARDEN
// ============================================================
function renderMyGarden() {
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
        <button class="btn btn-primary" onclick="navigateTo('ajouter')">+ Ajouter une plante</button>
      </div>`;
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

function buildPlantCard(up) {
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

// ============================================================
// PLANT DETAIL MODAL
// ============================================================
function openPlantDetail(id) {
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

function closePlantDetailModal() {
  document.getElementById('plant-detail-modal').classList.add('hidden');
}

// ============================================================
// ADD / EDIT PLANT FORM
// ============================================================
function resetAddForm() {
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

function prefillForm(plantId) {
  const dbPlant = DB.getPlant(plantId);
  if (!dbPlant) return;
  document.getElementById('plant-search-input').value = dbPlant.name;
  document.getElementById('selected-plant-id').value = plantId;
  showPlantPreview(dbPlant);
}

function prefillFormFromPlant(up) {
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

function showPlantPreview(dbPlant) {
  document.getElementById('preview-emoji').textContent = dbPlant.emoji;
  document.getElementById('preview-name').textContent = dbPlant.name;
  document.getElementById('preview-family').textContent = dbPlant.family;
  document.getElementById('preview-sun').textContent = Utils.capitalize(dbPlant.needs.sun);
  document.getElementById('preview-water').textContent = Utils.capitalize(dbPlant.needs.water);
  document.getElementById('preview-germination').textContent =
    `Germination : ${dbPlant.germination_days.min}-${dbPlant.germination_days.max} jours`;
  document.getElementById('plant-preview').classList.remove('hidden');
}

function updateDatePredictions() {
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

function handleAddPlant(e) {
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

// ============================================================
// UPDATE / DELETE PLANT
// ============================================================
function updatePlantStage(id, newStage, newDate) {
  const plant = App.plants.find(p => p.id === id);
  if (!plant) return;
  plant.currentStage = newStage;
  plant.stageDate = newDate;
  if (!plant.history) plant.history = [];
  plant.history.push({ stage: newStage, date: newDate });
  Storage.save(App.plants);
  showToast('Stade mis à jour ✅', 'success');
  if (App.currentPage === 'monpotager') renderMyGarden();
  if (App.currentPage === 'dashboard') renderDashboard();
}

function deletePlant(id) {
  if (!confirm('Supprimer cette plante du potager ?')) return;
  App.plants = App.plants.filter(p => p.id !== id);
  Storage.save(App.plants);
  showToast('Plante supprimée.', '');
  if (App.currentPage === 'monpotager') renderMyGarden();
  if (App.currentPage === 'dashboard') renderDashboard();
}

// ============================================================
// CALENDAR
// ============================================================
function renderCalendar() {
  const d = App.calendarDate;
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based

  document.getElementById('cal-title').textContent =
    `${Utils.monthName(month)} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday=0
  const daysInMonth = lastDay.getDate();

  // Collect events for this month
  const events = buildCalendarEvents(year, month + 1);

  const grid = document.getElementById('calendar-grid');
  let html = '';

  // Empty cells before first day
  for (let i = 0; i < startDow; i++) {
    html += '<div class="cal-day empty"></div>';
  }

  const todayStr = Utils.toInputDate(new Date());

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const dayEvents = events.filter(ev => ev.date === dateStr);

    html += `<div class="cal-day ${isToday ? 'today' : ''}">
      <div class="cal-day-num">${day}</div>
      <div class="cal-day-events">
        ${dayEvents.slice(0,3).map(ev => `
          <div class="cal-event-dot" style="background:${ev.color}" title="${ev.label}: ${ev.plant}">
            ${ev.emoji} ${ev.plant.length > 8 ? ev.plant.slice(0,7)+'…' : ev.plant}
          </div>
        `).join('')}
        ${dayEvents.length > 3 ? `<div style="font-size:10px;color:var(--text-secondary)">+${dayEvents.length-3}</div>` : ''}
      </div>
    </div>`;
  }

  grid.innerHTML = html;

  // Events list for the month
  const evList = document.getElementById('cal-events-list');
  if (events.length === 0) {
    evList.innerHTML = '<p class="empty-state">Aucun événement ce mois.</p>';
  } else {
    evList.innerHTML = events.map(ev => `
      <div class="cal-event-item" style="border-left-color:${ev.color}">
        <span class="cal-event-date">${Utils.formatDateShort(ev.date)}</span>
        <span>${ev.emoji} ${ev.plant}</span>
        <span style="flex:1;color:var(--text-secondary)">${ev.label}</span>
      </div>
    `).join('');
  }
}

function buildCalendarEvents(year, month) {
  const events = [];
  const pad = n => String(n).padStart(2, '0');

  App.plants.forEach(up => {
    const dbPlant = DB.getPlant(up.plantId);
    const name = up.customName || dbPlant?.name || up.plantId;

    // Stage date event
    const sd = new Date(up.stageDate + 'T00:00:00');
    if (sd.getFullYear() === year && sd.getMonth() + 1 === month) {
      const stage = DB.getStage(up.currentStage);
      events.push({
        date: up.stageDate,
        plant: name,
        label: stage?.name || up.currentStage,
        emoji: stage?.emoji || '🌱',
        color: stage?.color || '#4CAF50'
      });
    }

    // Predictions
    const preds = Predictions.compute(up);
    preds.forEach(pred => {
      const d = new Date(pred.dateMin + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        const colors = { germination: '#66BB6A', repiquage: '#1976D2', recolte: '#FFA000' };
        events.push({
          date: pred.dateMin,
          plant: name,
          label: pred.label,
          emoji: pred.icon,
          color: colors[pred.type] || '#9E9E9E'
        });
      }
    });
  });

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

// ============================================================
// LIBRARY
// ============================================================
function renderLibrary(filter = '') {
  const typeFilter = document.getElementById('lib-filter-type').value;
  let plants = App.db.vegetables;

  if (filter) {
    const q = filter.toLowerCase();
    plants = plants.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.family.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    );
  }

  if (typeFilter) {
    plants = plants.filter(p => p.type === typeFilter);
  }

  const grid = document.getElementById('library-grid');
  grid.innerHTML = plants.map(p => `
    <div class="lib-card" data-plant-id="${p.id}">
      <div class="lib-card-emoji">${p.emoji}</div>
      <div class="lib-card-name">${p.name}</div>
      <div class="lib-card-type">${Utils.capitalize(p.type)}</div>
      <div class="lib-card-meta">
        <span class="badge">${p.family}</span>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.lib-card').forEach(card => {
    card.addEventListener('click', () => openLibModal(card.dataset.plantId));
  });
}

function openLibModal(plantId) {
  const p = DB.getPlant(plantId);
  if (!p) return;

  const sowMonths = [
    ...(p.sowing.indoor ? p.sowing.indoor.months : []),
    ...(p.sowing.outdoor ? p.sowing.outdoor.months : [])
  ];
  const uniqueSow = [...new Set(sowMonths)].sort((a,b) => a-b);
  const transplantMonths = p.transplant?.months || [];
  const harvestMonths = p.harvest?.months || [];

  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div class="modal-plant-header">
      <span class="modal-plant-emoji">${p.emoji}</span>
      <div>
        <div class="modal-plant-name">${p.name}</div>
        <span class="badge">${p.family}</span> &nbsp;
        <span class="badge">${Utils.capitalize(p.type)}</span>
      </div>
    </div>

    <p style="color:var(--text-secondary);font-size:14px;margin-bottom:16px">${p.description}</p>

    <div class="modal-section">
      <h4>🌿 Besoins</h4>
      <div class="info-grid-2">
        <div class="info-item">
          <span class="info-item-icon">☀️</span>
          <div><span class="info-item-label">Ensoleillement</span><span class="info-item-value">${Utils.capitalize(p.needs.sun)}</span></div>
        </div>
        <div class="info-item">
          <span class="info-item-icon">💧</span>
          <div><span class="info-item-label">Arrosage</span><span class="info-item-value">${Utils.capitalize(p.needs.water)}</span></div>
        </div>
        <div class="info-item">
          <span class="info-item-icon">🌱</span>
          <div><span class="info-item-label">Sol</span><span class="info-item-value">${p.needs.soil}</span></div>
        </div>
        <div class="info-item">
          <span class="info-item-icon">📏</span>
          <div><span class="info-item-label">Espacement</span><span class="info-item-value">${p.needs.space_cm} cm</span></div>
        </div>
      </div>
    </div>

    <div class="modal-section">
      <h4>⏱️ Calendrier</h4>
      <div class="info-item" style="margin-bottom:8px">
        <span class="info-item-icon">🌀</span>
        <div><span class="info-item-label">Germination</span><span class="info-item-value">${p.germination_days.min}-${p.germination_days.max} jours</span></div>
      </div>
      ${uniqueSow.length ? `<div style="margin-bottom:8px"><span style="font-size:13px;color:var(--text-secondary)">Semis :</span><br><div class="month-row">${uniqueSow.map(m => `<span class="month-chip">${Utils.monthName(m-1)}</span>`).join('')}</div></div>` : ''}
      ${transplantMonths.length ? `<div style="margin-bottom:8px"><span style="font-size:13px;color:var(--text-secondary)">Repiquage :</span><br><div class="month-row">${transplantMonths.map(m => `<span class="month-chip">${Utils.monthName(m-1)}</span>`).join('')}</div></div>` : ''}
      ${harvestMonths.length ? `<div style="margin-bottom:8px"><span style="font-size:13px;color:var(--text-secondary)">Récolte :</span><br><div class="month-row">${harvestMonths.map(m => `<span class="month-chip" style="background:#FFF8E1;border-color:#FFE082;color:#E65100">${Utils.monthName(m-1)}</span>`).join('')}</div></div>` : ''}
    </div>

    ${p.varieties?.length ? `
    <div class="modal-section">
      <h4>🌾 Variétés</h4>
      <div class="companion-list">${p.varieties.map(v => `<span class="companion-chip good">${v}</span>`).join('')}</div>
    </div>` : ''}

    <div class="modal-section">
      <h4>🤝 Associations</h4>
      ${p.companions?.length ? `<div class="companion-list">${p.companions.map(c => `<span class="companion-chip good">✅ ${c}</span>`).join('')}</div>` : '<p style="font-size:13px;color:var(--text-secondary)">Aucune association connue.</p>'}
      ${p.enemies?.length ? `<div class="companion-list" style="margin-top:6px">${p.enemies.map(c => `<span class="companion-chip bad">❌ ${c}</span>`).join('')}</div>` : ''}
    </div>

    ${p.diseases?.length ? `
    <div class="modal-section">
      <h4>🦠 Maladies fréquentes</h4>
      <div class="disease-list">${p.diseases.map(d => `<span class="disease-chip">⚠️ ${d}</span>`).join('')}</div>
    </div>` : ''}

    ${p.tips ? `
    <div class="modal-section">
      <h4>💡 Conseils</h4>
      <p style="font-size:14px;color:var(--text-secondary);background:#F9FBE7;padding:12px;border-radius:8px">${p.tips}</p>
    </div>` : ''}

    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color)">
      <button class="btn btn-primary" onclick="navigateTo('ajouter');setTimeout(()=>prefillForm('${p.id}'),150);document.getElementById('plant-modal').classList.add('hidden')">
        + Ajouter à mon potager
      </button>
    </div>
  `;

  document.getElementById('plant-modal').classList.remove('hidden');
}

// ============================================================
// STATS
// ============================================================
function renderStats() {
  // By type
  const typeCounts = {};
  App.plants.forEach(up => {
    const db = DB.getPlant(up.plantId);
    const type = db?.type || 'inconnu';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const maxType = Math.max(1, ...Object.values(typeCounts));
  document.getElementById('stats-types').innerHTML = Object.entries(typeCounts).length
    ? Object.entries(typeCounts).map(([type, count]) => `
        <div class="bar-chart-row">
          <span class="bar-chart-label">${Utils.capitalize(type)}</span>
          <div class="bar-chart-bar-bg"><div class="bar-chart-bar" style="width:${Math.round(count/maxType*100)}%"></div></div>
          <span class="bar-chart-value">${count}</span>
        </div>
      `).join('')
    : '<p class="empty-state">Aucune donnée</p>';

  // By stage
  const stageCounts = {};
  App.plants.forEach(up => { stageCounts[up.currentStage] = (stageCounts[up.currentStage] || 0) + 1; });

  const maxStage = Math.max(1, ...Object.values(stageCounts));
  document.getElementById('stats-stages').innerHTML = Object.entries(stageCounts).length
    ? Object.entries(stageCounts).map(([sid, count]) => {
        const s = DB.getStage(sid);
        return `
          <div class="bar-chart-row">
            <span class="bar-chart-label">${s?.emoji || ''} ${s?.name || sid}</span>
            <div class="bar-chart-bar-bg"><div class="bar-chart-bar" style="width:${Math.round(count/maxStage*100)}%;background:${s?.color||'var(--color-primary)'}"></div></div>
            <span class="bar-chart-value">${count}</span>
          </div>
        `;
      }).join('')
    : '<p class="empty-state">Aucune donnée</p>';

  // Harvest history
  const harvested = App.plants.filter(p => p.currentStage === 'recolte' || p.currentStage === 'termine');
  const historyEl = document.getElementById('stats-harvest-history');
  historyEl.innerHTML = harvested.length
    ? harvested.map(up => {
        const db = DB.getPlant(up.plantId);
        return `
          <div class="harvest-item">
            <span style="font-size:24px">${db?.emoji || '🌱'}</span>
            <span style="flex:1;font-weight:600">${up.customName || db?.name || up.plantId}</span>
            ${up.variety ? `<span style="color:var(--text-secondary);font-style:italic">${up.variety}</span>` : ''}
            <span style="color:var(--color-accent);font-weight:600">× ${up.quantity}</span>
          </div>
        `;
      }).join('')
    : '<p class="empty-state">Aucune récolte enregistrée.</p>';
}

// ============================================================
// INIT
// ============================================================
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

// ============================================================
// BACKUP — EXPORT / IMPORT
// ============================================================
function exportBackup() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    plants: App.plants
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = Utils.toInputDate(new Date());
  a.href = url;
  a.download = `mon-potager-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Sauvegarde téléchargée ✅', 'success');
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const plants = Array.isArray(data) ? data : data.plants;
      if (!Array.isArray(plants)) throw new Error('Format invalide');
      const count = plants.length;
      if (!confirm(`Importer ${count} plante(s) ? Cela remplacera vos données actuelles.`)) return;
      App.plants = plants;
      Storage.save(App.plants);
      showToast(`${count} plante(s) importée(s) ✅`, 'success');
      if (App.currentPage === 'dashboard') renderDashboard();
      if (App.currentPage === 'monpotager') renderMyGarden();
    } catch (err) {
      showToast('Fichier invalide ou corrompu ❌', 'error');
    }
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', init);
