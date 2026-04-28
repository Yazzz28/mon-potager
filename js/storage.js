export const Storage = {
  KEY: 'monPotager_plants',
  load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch { return []; }
  },
  save(plants) {
    localStorage.setItem(this.KEY, JSON.stringify(plants));
  }
};
