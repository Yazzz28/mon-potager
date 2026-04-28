import { App } from './state.js';
import { Storage } from './storage.js';
import { Utils } from './utils.js';
import { showToast } from './toast.js';
import { renderDashboard } from './renders/dashboard.js';
import { renderMyGarden } from './renders/garden.js';

export function exportBackup() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    plants: App.plants
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = Utils.toInputDate(new Date());
  a.href = url;
  a.download = `mon-potager-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Sauvegarde téléchargée ✅', 'success');
}

export function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const plants = Array.isArray(data) ? data : data.plants;
      if (!Array.isArray(plants)) throw new Error('Format invalide');
      const count = plants.length;
      if (!confirm(`Importer ${count} plante(s) ? Cela remplacera vos données actuelles.`)) return;
      App.plants = plants;
      Storage.save(App.plants);
      showToast(`${count} plante(s) importée(s) ✅`, 'success');
      if (App.currentPage === 'dashboard') renderDashboard();
      if (App.currentPage === 'monpotager') renderMyGarden();
    } catch (err) {
      showToast('Fichier invalide ou corrompu ❌', 'error');
    }
  };
  reader.readAsText(file);
}
