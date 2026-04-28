import { App } from './state.js';

export const Utils = {
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
