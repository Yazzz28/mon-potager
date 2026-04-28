import { App } from '../state.js';
import { DB } from '../db.js';
import { Utils } from '../utils.js';

export function renderStats() {
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
