import { App } from '../state.js';
import { DB } from '../db.js';
import { Utils } from '../utils.js';
import { navigateTo } from '../navigation.js';
import { prefillForm } from './form.js';

export function renderLibrary(filter = '') {
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

export function openLibModal(plantId) {
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
      <button class="btn btn-primary" id="lib-add-btn">+ Ajouter à mon potager</button>
    </div>
  `;

  document.getElementById('plant-modal').classList.remove('hidden');
  document.getElementById('lib-add-btn').addEventListener('click', () => {
    document.getElementById('plant-modal').classList.add('hidden');
    navigateTo('ajouter');
    setTimeout(() => prefillForm(p.id), 150);
  });
}
