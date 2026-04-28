import { App } from './state.js';
import { Storage } from './storage.js';
import { showToast } from './toast.js';
import { renderMyGarden } from './renders/garden.js';
import { renderDashboard } from './renders/dashboard.js';

export function updatePlantStage(id, newStage, newDate) {
  const plant = App.plants.find(p => p.id === id);
  if (!plant) return;
  plant.currentStage = newStage;
  plant.stageDate = newDate;
  if (!plant.history) plant.history = [];
  plant.history.push({ stage: newStage, date: newDate });
  Storage.save(App.plants);
  showToast('Stade mis à jour ✅', 'success');
  if (App.currentPage === 'monpotager') renderMyGarden();
  if (App.currentPage === 'dashboard') renderDashboard();
}

export function deletePlant(id) {
  if (!confirm('Supprimer cette plante du potager ?')) return;
  App.plants = App.plants.filter(p => p.id !== id);
  Storage.save(App.plants);
  showToast('Plante supprimée.', '');
  if (App.currentPage === 'monpotager') renderMyGarden();
  if (App.currentPage === 'dashboard') renderDashboard();
}
