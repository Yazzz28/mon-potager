import { App } from './state.js';
import { DB } from './db.js';

const CACHE_KEY = 'monPotager_sunrise';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const PARIS     = { lat: 48.8566, lon: 2.3522 };

let _data = null;

function _loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    return (Date.now() - timestamp < CACHE_TTL) ? data : null;
  } catch { return null; }
}

function _saveCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data })); } catch {}
}

function _getCoords() {
  if (App.weather?.lat && App.weather?.lon) {
    return Promise.resolve({ lat: App.weather.lat, lon: App.weather.lon });
  }
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(PARIS);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => resolve(PARIS),
      { timeout: 5000 }
    );
  });
}

function _fmtTime(utcStr) {
  return new Date(utcStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function renderDashboardSection() {
  const section = document.getElementById('sunrise-sunset-section');
  const content = document.getElementById('sunrise-sunset-content');
  if (!section || !content || !_data) return;

  const heureLevert  = _fmtTime(_data.sunrise);
  const heureCoucher = _fmtTime(_data.sunset);
  const dayLengthH   = Math.floor(_data.day_length / 3600);
  const dayLengthM   = Math.floor((_data.day_length % 3600) / 60);

  const sunPlants = App.plants
    .filter(p => p.currentStage !== 'termine')
    .filter(p => DB.getPlant(p.plantId)?.needs?.sun === 'plein soleil');
  const sunSufficient = dayLengthH >= 6;

  let sunAdvice = '';
  if (sunPlants.length > 0) {
    const names = [...new Set(sunPlants.map(p => {
      const db = DB.getPlant(p.plantId);
      return p.customName || db?.name || p.plantId;
    }))].join(', ');
    sunAdvice = `
      <div class="sunrise-sun-advice ${sunSufficient ? 'advice-ok' : 'advice-warn'}">
        <span>${sunSufficient ? '✅' : '⚠️'}</span>
        <p>${sunSufficient
          ? `${dayLengthH}h de soleil aujourd'hui — conditions optimales pour ${names}`
          : `Seulement ${dayLengthH}h de soleil — surveille tes plantes plein soleil : ${names}`
        }</p>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="sunrise-widget">
      <div class="sunrise-times">
        <div class="sunrise-item">
          <span class="sunrise-icon">🌅</span>
          <div>
            <strong>Lever</strong>
            <span>${heureLevert}</span>
          </div>
        </div>
        <div class="sunrise-item">
          <span class="sunrise-icon">☀️</span>
          <div>
            <strong>Durée</strong>
            <span>${dayLengthH}h ${dayLengthM}min</span>
          </div>
        </div>
        <div class="sunrise-item">
          <span class="sunrise-icon">🌇</span>
          <div>
            <strong>Coucher</strong>
            <span>${heureCoucher}</span>
          </div>
        </div>
      </div>
      ${sunAdvice}
    </div>
  `;
  section.classList.remove('hidden');
}

async function init() {
  const cached = _loadCache();
  if (cached) {
    _data = cached;
    renderDashboardSection();
    return;
  }
  try {
    const coords = await _getCoords();
    const today  = new Date().toISOString().split('T')[0];
    const url    = `https://api.sunrise-sunset.org/json?lat=${coords.lat}&lng=${coords.lon}&date=${today}&formatted=0`;
    const res    = await fetch(url);
    const json   = await res.json();
    if (json.status !== 'OK') return;
    _data = {
      sunrise:    json.results.sunrise,
      sunset:     json.results.sunset,
      day_length: json.results.day_length,
    };
    _saveCache(_data);
    renderDashboardSection();
  } catch {
    // Silent fail — section stays hidden
  }
}

export const SunriseSunset = { init, renderDashboardSection };
