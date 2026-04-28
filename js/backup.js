import { App } from './state.js';
import { Storage } from './storage.js';
import { TerrainStorage } from './terrain-storage.js';
import { Utils } from './utils.js';
import { showToast } from './toast.js';
import { renderDashboard } from './renders/dashboard.js';
import { renderMyGarden } from './renders/garden.js';
import { renderTerrain } from './renders/terrain.js';

export function exportBackup() {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    plants: App.plants,
    terrain: {
      width:  App.terrain.width,
      height: App.terrain.height,
      cells:  App.terrain.cells,
    },
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

      const terrainData = data.terrain || null;
      const terrainInfo = terrainData
        ? ` + terrain (${terrainData.width}×${terrainData.height})`
        : '';

      if (!confirm(`Importer ${plants.length} plante(s)${terrainInfo} ? Cela remplacera vos données actuelles.`)) return;

      // Restore plants
      App.plants = plants;
      Storage.save(App.plants);

      // Restore terrain if present
      if (terrainData && Array.isArray(terrainData.cells)) {
        App.terrain.width  = terrainData.width  || 10;
        App.terrain.height = terrainData.height || 8;
        App.terrain.cells  = terrainData.cells;
        App.terrain.selectedCell = null;
        TerrainStorage.save(terrainData);
      }

      showToast(`${plants.length} plante(s)${terrainInfo} importée(s) ✅`, 'success');

      if (App.currentPage === 'dashboard') renderDashboard();
      if (App.currentPage === 'monpotager') renderMyGarden();
      if (App.currentPage === 'terrain') renderTerrain();
    } catch (err) {
      showToast('Fichier invalide ou corrompu ❌', 'error');
    }
  };
  reader.readAsText(file);
}
