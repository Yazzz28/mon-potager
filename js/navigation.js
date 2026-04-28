import { App } from './state.js';
import { renderDashboard } from './renders/dashboard.js';
import { renderMyGarden } from './renders/garden.js';
import { renderCalendar } from './renders/calendar.js';
import { renderLibrary } from './renders/library.js';
import { renderStats } from './renders/stats.js';
import { resetAddForm } from './renders/form.js';

export function navigateTo(page) {
  App.currentPage = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard: 'Tableau de bord',
    monpotager: 'Mon Potager',
    ajouter: 'Ajouter une plante',
    calendrier: 'Calendrier',
    bibliotheque: 'Bibliothèque',
    stats: 'Statistiques'
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;

  // Render page content
  if (page === 'dashboard') renderDashboard();
  if (page === 'monpotager') renderMyGarden();
  if (page === 'calendrier') renderCalendar();
  if (page === 'bibliotheque') renderLibrary();
  if (page === 'stats') renderStats();
  if (page === 'ajouter') resetAddForm();

  // Close sidebar on mobile
  if (window.innerWidth < 900) {
    document.getElementById('sidebar').classList.remove('open');
  }

  window.scrollTo(0, 0);
}
