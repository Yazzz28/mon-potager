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
  'pucerons': {
    name: 'Pucerons', emoji: '🐛',
    tempMin: 15, tempMax: 25, precipMin: 0,
    tip: 'Pulvériser du savon noir dilué',
  },
  'pucerons cendrés': {
    name: 'Pucerons cendrés', emoji: '🐛',
    tempMin: 15, tempMax: 25, precipMin: 0,
    tip: 'Introduire des coccinelles',
  },
  'pucerons noirs': {
    name: 'Pucerons noirs', emoji: '🐛',
    tempMin: 12, tempMax: 25, precipMin: 0,
    tip: 'Associer avec capucines (plantes pièges)',
  },
  'pucerons rouges': {
    name: 'Pucerons rouges', emoji: '🐛',
    tempMin: 15, tempMax: 25, precipMin: 0,
    tip: 'Pulvériser purin d\'ortie dilué',
  },
  'rouille': {
    name: 'Rouille', emoji: '🍄',
    tempMin: 15, tempMax: 25, precipMin: 3, highHumidity: true,
    tip: 'Supprimer les feuilles atteintes, aérer',
  },
  'rouille de l ail': {
    name: 'Rouille de l\'ail', emoji: '🍄',
    tempMin: 10, tempMax: 20, precipMin: 3, highHumidity: true,
    tip: 'Éviter l\'excès d\'azote',
  },
  'rouille de l asperge': {
    name: 'Rouille de l\'asperge', emoji: '🍄',
    tempMin: 15, tempMax: 25, precipMin: 3, highHumidity: true,
    tip: 'Couper les tiges atteintes en automne',
  },
  'rouille du poireau': {
    name: 'Rouille du poireau', emoji: '🍄',
    tempMin: 10, tempMax: 20, precipMin: 3, highHumidity: true,
    tip: 'Espacer les plants, rotation 4 ans',
  },
  'rouille vésiculeuse': {
    name: 'Rouille vésiculeuse', emoji: '🍄',
    tempMin: 15, tempMax: 22, precipMin: 5, highHumidity: true,
    tip: 'Supprimer hôtes intermédiaires (groseilliers)',
  },
  'anthracnose': {
    name: 'Anthracnose', emoji: '🍄',
    tempMin: 20, tempMax: 30, precipMin: 5,
    tip: 'Éviter l\'arrosage par aspersion',
  },
  'araignée rouge': {
    name: 'Araignée rouge', emoji: '🕷️',
    tempMin: 20, tempMax: 30, precipMin: 0,
    tip: 'Brumiser le feuillage, maintenir l\'humidité',
  },
  'botrytis': {
    name: 'Botrytis', emoji: '🍄',
    tempMin: 15, tempMax: 25, precipMin: 5, highHumidity: true,
    tip: 'Aérer, supprimer parties atteintes',
  },
  'cercosporiose': {
    name: 'Cercosporiose', emoji: '🍄',
    tempMin: 20, tempMax: 30, precipMin: 5,
    tip: 'Rotation des cultures, supprimer feuilles atteintes',
  },
  'charançon de la patate': {
    name: 'Charançon de la patate', emoji: '🐛',
    tempMin: 15, tempMax: 25, precipMin: 0,
    tip: 'Ramassage manuel, pièges',
  },
  'charbon du maïs': {
    name: 'Charbon du maïs', emoji: '🍄',
    tempMin: 25, tempMax: 35, precipMin: 0,
    tip: 'Détruire les galles avant sporulation',
  },
  'chenilles': {
    name: 'Chenilles', emoji: '🐛',
    tempMin: 15, tempMax: 30, precipMin: 0,
    tip: 'Traitement au Bacillus thuringiensis (Bt)',
  },
  'chenilles blanches': {
    name: 'Chenilles blanches', emoji: '🐛',
    tempMin: 15, tempMax: 25, precipMin: 0,
    tip: 'Travailler le sol en automne pour exposer les larves',
  },
  'doryphore': {
    name: 'Doryphore', emoji: '🐛',
    tempMin: 20, tempMax: 30, precipMin: 0,
    tip: 'Ramassage manuel des adultes et larves',
  },
  'hernie du chou': {
    name: 'Hernie du chou', emoji: '🍄',
    tempMin: 18, tempMax: 25, precipMin: 5,
    tip: 'Chauler le sol (pH > 7.2), rotation 7 ans',
  },
  'mildiou de l oignon': {
    name: 'Mildiou de l\'oignon', emoji: '🍄',
    tempMin: 10, tempMax: 22, precipMin: 5, highHumidity: true,
    tip: 'Espacer les plants, éviter excès d\'eau',
  },
  'mouche de l oignon': {
    name: 'Mouche de l\'oignon', emoji: '🐛',
    tempMin: 15, tempMax: 22, precipMin: 0,
    tip: 'Filet anti-insectes, rotation',
  },
  'mouche du céleri': {
    name: 'Mouche du céleri', emoji: '🐛',
    tempMin: 15, tempMax: 22, precipMin: 0,
    tip: 'Filet anti-insectes',
  },
  'phytophthora': {
    name: 'Phytophthora', emoji: '🍄',
    tempMin: 15, tempMax: 25, precipMin: 10, highHumidity: true,
    tip: 'Drainage, éviter excès d\'arrosage',
  },
  'pourriture blanche': {
    name: 'Pourriture blanche', emoji: '🍄',
    tempMin: 15, tempMax: 20, precipMin: 3, highHumidity: true,
    tip: 'Rotation longue (8 ans), pas de fumure fraîche',
  },
  'pourriture de la couronne': {
    name: 'Pourriture de la couronne', emoji: '🍄',
    tempMin: 15, tempMax: 25, precipMin: 5, highHumidity: true,
    tip: 'Améliorer le drainage, éviter les blessures',
  },
  'septoriose': {
    name: 'Septoriose', emoji: '🍄',
    tempMin: 15, tempMax: 25, precipMin: 5, highHumidity: true,
    tip: 'Supprimer feuilles basses, paillage au pied',
  },
  'teigne du poireau': {
    name: 'Teigne du poireau', emoji: '🐛',
    tempMin: 15, tempMax: 25, precipMin: 0,
    tip: 'Filet anti-insectes, piège à phéromones',
  },
  'verticilliose': {
    name: 'Verticilliose', emoji: '🍄',
    tempMin: 20, tempMax: 28, precipMin: 3,
    tip: 'Solarisation du sol, rotation 5 ans',
  },
};

function _normalize(str) {
  return str.toLowerCase().normalize('NFC').replace(/_/g, ' ').trim();
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
