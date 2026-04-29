import { App } from './state.js';

const CACHE_KEY = 'monPotager_weather';
const CACHE_TTL = 60 * 60 * 1000; // 1 heure

const WMO = {
  0:  ['Ensoleillé',              '☀️'],
  1:  ['Peu nuageux',             '🌤️'],
  2:  ['Partiellement nuageux',   '⛅'],
  3:  ['Couvert',                 '☁️'],
  45: ['Brouillard',              '🌫️'],
  48: ['Brouillard givrant',      '🌫️'],
  51: ['Bruine légère',           '🌦️'],
  53: ['Bruine',                  '🌦️'],
  55: ['Bruine forte',            '🌧️'],
  61: ['Pluie légère',            '🌧️'],
  63: ['Pluie',                   '🌧️'],
  65: ['Pluie forte',             '🌧️'],
  71: ['Neige légère',            '🌨️'],
  73: ['Neige',                   '❄️'],
  75: ['Neige forte',             '❄️'],
  80: ['Averses légères',         '🌦️'],
  81: ['Averses',                 '🌧️'],
  82: ['Averses fortes',          '⛈️'],
  95: ['Orage',                   '⛈️'],
  96: ['Orage avec grêle',        '⛈️'],
  99: ['Orage fort',              '⛈️'],
};

function _codeInfo(code) {
  if (WMO[code]) return { label: WMO[code][0], emoji: WMO[code][1] };
  const keys = Object.keys(WMO).map(Number).sort((a, b) => a - b);
  const match = keys.filter(k => k <= code).pop() ?? 0;
  return WMO[match] ? { label: WMO[match][0], emoji: WMO[match][1] } : { label: 'Variable', emoji: '🌡️' };
}

function _fmtDate(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short'
  });
}

function _loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return (Date.now() - d.fetchedAt < CACHE_TTL) ? d : null;
  } catch { return null; }
}

function _saveCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

function _getCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Géolocalisation non supportée'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => reject(new Error('Permission refusée'))
    );
  });
}

async function _fetchCityName(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
    const res = await fetch(url, { headers: { 'User-Agent': 'MonPotager/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.address?.city ?? data.address?.town ?? data.address?.village ?? data.address?.municipality ?? null;
  } catch { return null; }
}

async function _fetchRaw(lat, lon) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  Object.entries({
    latitude:      lat,
    longitude:     lon,
    current:       'temperature_2m,weathercode,precipitation',
    daily:         'temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,weathercode',
    forecast_days: 3,
    timezone:      'auto',
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function _parse(raw, lat, lon) {
  if (!raw?.current || !raw?.daily?.time) throw new Error('Réponse API incomplète');
  const c = raw.current;
  const d = raw.daily;
  return {
    fetchedAt: Date.now(),
    lat, lon,
    current: {
      temp: Math.round(c.temperature_2m ?? 0),
      code: c.weathercode ?? 0,
      ..._codeInfo(c.weathercode ?? 0),
    },
    days: d.time.map((date, i) => ({
      date,
      tempMin:     Math.round(d.temperature_2m_min[i] ?? 0),
      tempMax:     Math.round(d.temperature_2m_max[i] ?? 0),
      precipSum:   Math.round((d.precipitation_sum[i] ?? 0) * 10) / 10,
      precipProba: d.precipitation_probability_max[i] ?? 0,
      code:        d.weathercode[i] ?? 0,
      ..._codeInfo(d.weathercode[i] ?? 0),
    })),
  };
}

function _updateWidget() {
  const loading = document.getElementById('weather-loading');
  const content = document.getElementById('weather-content');
  if (!loading || !content) return;
  const w = App.weather;
  if (!w) {
    const label = loading.querySelector('#season-label');
    if (label) label.textContent += ' · Météo indisponible';
    return;
  }

  loading.classList.add('hidden');
  content.classList.remove('hidden');

  const cityEl = document.getElementById('weather-city');
  if (cityEl) cityEl.textContent = w.cityName ?? '';

  document.getElementById('weather-emoji').textContent = w.current.emoji;
  document.getElementById('weather-temp').textContent  = `${w.current.temp}°C`;
  document.getElementById('weather-label').textContent = w.current.label;

  document.getElementById('weather-forecast').innerHTML = w.days.map(day => `
    <div class="weather-day">
      <span class="wd-emoji">${day.emoji}</span>
      <span class="wd-temps">${day.tempMin}° / ${day.tempMax}°</span>
      ${day.precipSum > 0 ? `<span class="wd-rain">💧 ${day.precipSum}mm</span>` : ''}
    </div>
  `).join('');
}

function _updateDashboardSection() {
  const section = document.getElementById('weather-section');
  if (!section) return;
  const w = App.weather;
  if (!w) { section.classList.add('hidden'); return; }

  section.classList.remove('hidden');
  document.getElementById('weather-alerts-list').innerHTML = `
    <div class="weather-forecast-dashboard">
      ${w.days.map(day => `
        <div class="weather-forecast-day">
          <span class="wfd-date">${_fmtDate(day.date)}</span>
          <span class="wfd-emoji">${day.emoji}</span>
          <div class="wfd-info">
            <span class="wfd-label">${day.label}</span>
            <span class="wfd-temps">${day.tempMin}° / ${day.tempMax}°C</span>
          </div>
          <span class="wfd-rain">${day.precipSum > 0 ? `💧 ${day.precipSum}mm` : ''}</span>
        </div>
      `).join('')}
    </div>
  `;
}

export const Weather = {
  async init() {
    const cached = _loadCache();
    if (cached) {
      App.weather = cached;
      _updateWidget();
      _updateDashboardSection();
      return;
    }
    try {
      const coords = await _getCoords();
      const [raw, cityName] = await Promise.all([
        _fetchRaw(coords.lat, coords.lon),
        _fetchCityName(coords.lat, coords.lon),
      ]);
      App.weather          = _parse(raw, coords.lat, coords.lon);
      App.weather.cityName = cityName;
      _saveCache(App.weather);
    } catch (e) {
      console.warn('[Weather]', e.message);
      App.weather = null;
    }
    _updateWidget();
    _updateDashboardSection();
  },

  getAlerts() {
    if (!App.weather) return [];
    const { days } = App.weather;
    const alerts = [];

    const frost = days.find(d => d.tempMin < 2);
    if (frost) {
      alerts.push({
        type: 'danger', icon: '🧊',
        title: `Gel imminent — ${_fmtDate(frost.date)}`,
        text:  `Minimum ${frost.tempMin}°C prévu. Protégez vos semis et jeunes plants sensibles !`,
      });
    }

    const rain = days.find(d => d.precipSum > 10 || d.precipProba > 80);
    if (rain) {
      alerts.push({
        type: 'info', icon: '🌧️',
        title: `Fortes pluies prévues — ${_fmtDate(rain.date)}`,
        text:  `${rain.precipSum}mm attendus (${rain.precipProba}% de probabilité). Anticipez la récolte des légumes fragiles.`,
      });
    }

    // Alerte sécheresse uniquement si aucun événement pluvieux n'est déjà signalé
    if (!rain && days.filter(d => d.precipSum < 1).length >= 3) {
      alerts.push({
        type: 'warning', icon: '💧',
        title: 'Arrosage recommandé',
        text:  'Aucune pluie significative prévue sur 3 jours. Pensez à arroser votre potager !',
      });
    }

    return alerts;
  },

  getDayData(dateStr) {
    return App.weather?.days.find(d => d.date === dateStr) ?? null;
  },

  renderDashboardSection: _updateDashboardSection,
  renderWidget:           _updateWidget,
};
