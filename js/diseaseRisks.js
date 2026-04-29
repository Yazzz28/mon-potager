import { App } from './state.js';
import { DB } from './db.js';

const DISEASE_CONDITIONS = {
  'mildiou': {
    name: 'Mildiou', emoji: '🍂',
    tempMin: 10, tempMax: 25, precipMin: 5,
    tip: 'Évite d\'arroser le feuillage, aère bien tes plantes',
  },
  'oïdium': {
    name: 'Oïdium', emoji: '🌿',
    tempMin: 18, tempMax: 30, precipMin: 0, highHumidity: true,
    tip: 'Pulvérise du bicarbonate de soude dilué, améliore l\'aération',
  },
  'alternariose': {
    name: 'Alternariose', emoji: '🍁',
    tempMin: 20, tempMax: 30, precipMin: 5,
    tip: 'Évite de mouiller le feuillage, retire les feuilles atteintes',
  },
  'pourriture grise': {
    name: 'Botrytis (pourriture grise)', emoji: '🌫️',
    tempMin: 15, tempMax: 25, precipMin: 5,
    tip: 'Retire les parties atteintes, améliore la ventilation',
  },
  'fusariose': {
    name: 'Fusariose', emoji: '🌱',
    tempMin: 20, tempMax: 28, precipMin: 5,
    tip: 'Évite l\'excès d\'humidité au sol, arrose uniquement à la base',
  },
  'mouche de la carotte': {
    name: 'Mouche de la carotte', emoji: '🪲',
    tempMin: 15, tempMax: 22, precipMin: 3,
    tip: 'Pose un voile insect-proof sur tes carottes',
  },
  'altise': {
    name: 'Altise', emoji: '🪲',
    tempMin: 15, tempMax: 28, precipMin: 0,
    tip: 'Arrose régulièrement le sol, pose un voile de protection',
  },
  'limaces': {
    name: 'Limaces', emoji: '🐌',
    tempMin: 8, tempMax: 20, precipMin: 3,
    tip: 'Pose des pièges à bière ou des cendres en barrière',
  },
};

function _normalize(str) {
  return str.toLowerCase().replace(/_/g, ' ').trim();
}

function _matchCondition(condition, days) {
  return days.some(day => {
    const avgTemp = (day.tempMin + day.tempMax) / 2;
    const tempOk  = avgTemp >= condition.tempMin && avgTemp <= condition.tempMax;
    if (!tempOk) return false;
    if (condition.precipMin === 0) return true;
    if (condition.highHumidity) return day.precipProba >= 40;
    return day.precipSum >= condition.precipMin || day.precipProba >= 60;
  });
}

function renderDashboardSection() {
  const section = document.getElementById('disease-risks-section');
  const list    = document.getElementById('disease-risks-list');
  if (!section || !list) return;

  if (!App.weather?.days?.length) return;

  const days         = App.weather.days;
  const activePlants = App.plants.filter(p => p.currentStage !== 'termine');

  const risks = {};
  activePlants.forEach(plant => {
    const dbPlant = DB.getPlant(plant.plantId);
    if (!dbPlant?.diseases) return;
    dbPlant.diseases.forEach(raw => {
      const key       = _normalize(raw);
      const condition = DISEASE_CONDITIONS[key];
      if (!condition || !_matchCondition(condition, days)) return;
      if (!risks[key]) risks[key] = { condition, plants: [] };
      risks[key].plants.push(plant.customName || dbPlant.name);
    });
  });

  const riskList = Object.values(risks).sort((a, b) => b.plants.length - a.plants.length);

  if (riskList.length === 0) {
    list.innerHTML = '<p class="empty-state">Pas de risque maladie détecté avec la météo actuelle 🌿</p>';
  } else {
    list.innerHTML = riskList.slice(0, 5).map(({ condition, plants }) => {
      const names = [...new Set(plants)].join(', ');
      return `
        <div class="alert-item alert-warning">
          <span class="alert-icon">${condition.emoji}</span>
          <div class="alert-text">
            <strong>${condition.name} — ${names}</strong>
            <small>${condition.tip}</small>
          </div>
        </div>
      `;
    }).join('');
  }

  section.classList.remove('hidden');
}

export const DiseaseRisks = { renderDashboardSection };
