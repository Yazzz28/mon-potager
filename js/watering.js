import { App } from './state.js';
import { DB } from './db.js';

const WATER_THRESHOLDS = {
  'abondant': { dailyNeed: 5, label: 'Arrosage abondant' },
  'régulier': { dailyNeed: 3, label: 'Arrosage régulier' },
  'modéré':   { dailyNeed: 1, label: 'Arrosage modéré' },
  'peu':      { dailyNeed: 0.5, label: 'Arrosage léger' },
};

function _avgPrecip(days) {
  if (!days || days.length === 0) return 0;
  const total = days.reduce((sum, d) => sum + (d.precipSum || 0), 0);
  return total / days.length;
}

function _urgencyFor(waterNeed, avgPrecip) {
  const threshold = WATER_THRESHOLDS[waterNeed];
  if (!threshold) return 'ok';
  if (avgPrecip < 0.5 && (waterNeed === 'abondant' || waterNeed === 'régulier')) return 'urgent';
  if (avgPrecip < threshold.dailyNeed) return 'conseillé';
  return 'ok';
}

function getRecommendations() {
  if (!App.weather?.days?.length) return [];

  const days = App.weather.days;
  const avgPrecip = _avgPrecip(days);
  const activePlants = App.plants.filter(p => p.currentStage !== 'termine');

  const groups = { urgent: [], conseillé: [], ok: [] };

  activePlants.forEach(plant => {
    const dbPlant = DB.getPlant(plant.plantId);
    if (!dbPlant?.needs?.water) return;

    const waterNeed = dbPlant.needs.water;
    const urgency = _urgencyFor(waterNeed, avgPrecip);
    const threshold = WATER_THRESHOLDS[waterNeed];
    const name = plant.customName || dbPlant.name;
    const emoji = dbPlant.emoji || '🌱';

    groups[urgency].push({ name, emoji, waterNeed, dailyNeed: threshold?.dailyNeed ?? 0, avgPrecip });
  });

  const result = [];

  if (groups.urgent.length > 0) {
    result.push({
      plants: groups.urgent,
      urgency: 'urgent',
      message: 'Arrosage urgent requis',
    });
  }

  if (groups.conseillé.length > 0) {
    result.push({
      plants: groups.conseillé,
      urgency: 'conseillé',
      message: 'Arrosage conseillé',
    });
  }

  if (groups.ok.length > 0) {
    result.push({
      plants: groups.ok,
      urgency: 'ok',
      message: 'Arrosage suffisant',
    });
  }

  return result;
}

function renderDashboardSection() {
  const section = document.getElementById('watering-section');
  const list    = document.getElementById('watering-list');
  if (!section || !list) return;

  if (!App.weather?.days?.length) return;

  const recommendations = getRecommendations();
  const avgPrecip = _avgPrecip(App.weather.days);

  const hasNeedingWater = recommendations.some(r => r.urgency !== 'ok');

  if (!hasNeedingWater) {
    list.innerHTML = '<p class="empty-state">Pas d\'arrosage nécessaire aujourd\'hui ✅</p>';
    section.classList.remove('hidden');
    return;
  }

  list.innerHTML = recommendations
    .filter(r => r.urgency !== 'ok')
    .map(({ plants, urgency }) => {
      return plants.map(plant => {
        const cssClass = urgency === 'urgent' ? 'watering-urgent' : 'watering-advised';
        return `
          <div class="watering-item ${cssClass}">
            <span>${plant.emoji}</span>
            <div class="alert-text">
              <strong>${plant.name}</strong>
              <small>💧 Arrosage nécessaire — ${avgPrecip.toFixed(1)} mm prévus, besoin ${plant.dailyNeed} mm/jour</small>
            </div>
          </div>
        `;
      }).join('');
    }).join('');

  section.classList.remove('hidden');
}

export const Watering = { getRecommendations, renderDashboardSection };
