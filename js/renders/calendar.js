import { App } from '../state.js';
import { DB } from '../db.js';
import { Utils } from '../utils.js';
import { Predictions } from '../predictions.js';
import { Weather } from '../weather.js';

export function renderCalendar() {
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

    const wDay = Weather.getDayData(dateStr);
    let weatherBadge = '';
    if (wDay) {
      if (wDay.tempMin < 2) {
        weatherBadge = `<div class="cal-weather-badge frost">🧊 ${wDay.tempMin}°</div>`;
      } else if (wDay.precipSum > 10 || wDay.precipProba > 80) {
        weatherBadge = `<div class="cal-weather-badge heavy-rain">🌧️ ${wDay.precipSum}mm</div>`;
      } else if (wDay.precipSum > 0) {
        weatherBadge = `<div class="cal-weather-badge rain">💧 ${wDay.precipSum}mm</div>`;
      }
    }

    html += `<div class="cal-day ${isToday ? 'today' : ''}">
      <div class="cal-day-num">${day}</div>
      <div class="cal-day-events">
        ${weatherBadge}
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

export function buildCalendarEvents(year, month) {
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
