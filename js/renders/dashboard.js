import { App } from '../state.js';
import { DB } from '../db.js';
import { Utils } from '../utils.js';
import { Alerts } from '../alerts.js';
import { Predictions } from '../predictions.js';
import { navigateTo } from '../navigation.js';
import { prefillForm } from './form.js';
import { Weather } from '../weather.js';
import { DiseaseRisks } from '../diseaseRisks.js';
import { SunriseSunset } from '../sunriseSunset.js';

export function renderDashboard() {
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

  DiseaseRisks.renderDashboardSection();
  SunriseSunset.renderDashboardSection();
  Weather.renderDashboardSection();
}
