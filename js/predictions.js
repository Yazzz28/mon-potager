import { App } from './state.js';
import { Utils } from './utils.js';
import { DB } from './db.js';

export const Predictions = {
  /** Given a user plant entry, compute key upcoming dates */
  compute(userPlant) {
    const dbPlant = DB.getPlant(userPlant.plantId);
    if (!dbPlant) return [];

    const stageId = userPlant.currentStage;
    const stageDate = userPlant.stageDate;
    const results = [];

    const germMin = dbPlant.germination_days?.min || 7;
    const germMax = dbPlant.germination_days?.max || 21;

    if (stageId === 'semis_interieur' || stageId === 'semis_exterieur') {
      // predict germination
      results.push({
        icon: '🌿',
        label: 'Germination estimée',
        dateMin: Utils.addDays(stageDate, germMin),
        dateMax: Utils.addDays(stageDate, germMax),
        type: 'germination'
      });

      // predict transplant if indoor sowing
      if (stageId === 'semis_interieur' && dbPlant.transplant) {
        const transplantDays = 35; // ~5 weeks for most plants
        results.push({
          icon: '🌾',
          label: 'Repiquage en pleine terre',
          dateMin: Utils.addDays(stageDate, transplantDays),
          dateMax: Utils.addDays(stageDate, transplantDays + 14),
          type: 'repiquage'
        });
      }

      // predict harvest
      if (dbPlant.harvest?.days_from_transplant) {
        const harvestBase = stageId === 'semis_interieur' ? 35 : 0;
        results.push({
          icon: '🧺',
          label: 'Récolte estimée',
          dateMin: Utils.addDays(stageDate, harvestBase + dbPlant.harvest.days_from_transplant.min),
          dateMax: Utils.addDays(stageDate, harvestBase + dbPlant.harvest.days_from_transplant.max),
          type: 'recolte'
        });
      }
    }

    if (stageId === 'germination') {
      if (dbPlant.transplant) {
        results.push({
          icon: '🌾',
          label: 'Repiquage recommandé',
          dateMin: Utils.addDays(stageDate, 21),
          dateMax: Utils.addDays(stageDate, 35),
          type: 'repiquage'
        });
      }
    }

    if (stageId === 'repiquage' || stageId === 'croissance') {
      if (dbPlant.harvest?.days_from_transplant) {
        results.push({
          icon: '🧺',
          label: 'Récolte estimée',
          dateMin: Utils.addDays(stageDate, dbPlant.harvest.days_from_transplant.min),
          dateMax: Utils.addDays(stageDate, dbPlant.harvest.days_from_transplant.max),
          type: 'recolte'
        });
      }
    }

    return results;
  },

  /** Get all upcoming events across all user plants */
  getAllUpcoming(daysAhead = 60) {
    const events = [];
    const today = Utils.toInputDate(new Date());
    const limit = Utils.addDays(today, daysAhead);

    App.plants.forEach(up => {
      const preds = this.compute(up);
      const dbPlant = DB.getPlant(up.plantId);
      preds.forEach(pred => {
        if (pred.dateMin <= limit) {
          events.push({
            plantId: up.plantId,
            userPlantId: up.id,
            plantName: up.customName || dbPlant?.name || up.plantId,
            emoji: dbPlant?.emoji || '🌱',
            ...pred
          });
        }
      });
    });

    events.sort((a, b) => a.dateMin.localeCompare(b.dateMin));
    return events;
  }
};
