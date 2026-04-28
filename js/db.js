import { App } from './state.js';
import { Utils } from './utils.js';

export const DB = {
  getPlant(id) {
    return App.db.vegetables.find(v => v.id === id);
  },
  getStage(id) {
    return App.db.stages.find(s => s.id === id);
  },
  searchPlants(query) {
    const q = query.toLowerCase();
    return App.db.vegetables.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.family.toLowerCase().includes(q) ||
      v.type.toLowerCase().includes(q) ||
      (v.varieties && v.varieties.some(va => va.toLowerCase().includes(q)))
    );
  },
  getSowableThisMonth() {
    const m = Utils.currentMonth();
    return App.db.vegetables.filter(v => {
      const sow = v.sowing;
      return (sow.indoor && sow.indoor.months.includes(m)) ||
             (sow.outdoor && sow.outdoor.months.includes(m)) ||
             (v.transplant && v.transplant.months.includes(m));
    });
  }
};
