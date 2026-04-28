export const TerrainStorage = {
  KEY: 'monPotager_terrain',
  load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || null;
    } catch { return null; }
  },
  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  }
};
