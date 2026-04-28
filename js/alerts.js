import { App } from './state.js';
import { Utils } from './utils.js';
import { DB } from './db.js';
import { Predictions } from './predictions.js';

export const Alerts = {
  compute() {
    const alerts = [];
    const today = Utils.toInputDate(new Date());
    const in7 = Utils.addDays(today, 7);

    App.plants.forEach(up => {
      const dbPlant = DB.getPlant(up.plantId);
      if (!dbPlant) return;
      const name = up.customName || dbPlant.name;

      // Check if harvest is overdue
      if (up.currentStage === 'fructification' || up.currentStage === 'recolte') {
        const daysSince = Utils.daysBetween(up.stageDate, today);
        if (daysSince > 14) {
          alerts.push({
            type: 'warning',
            icon: '🧺',
            title: `${dbPlant.emoji} ${name} — Récolte en attente`,
            text: `Au stade "${up.currentStage}" depuis ${daysSince} jours. Pensez à récolter !`
          });
        }
      }

      // Check if repiquage is upcoming
      const preds = Predictions.compute(up);
      preds.forEach(pred => {
        if (pred.type === 'repiquage' && pred.dateMin <= in7 && pred.dateMin >= today) {
          alerts.push({
            type: 'info',
            icon: '🌾',
            title: `${dbPlant.emoji} ${name} — Repiquage bientôt`,
            text: `Repiquage recommandé vers le ${Utils.formatDate(pred.dateMin)}`
          });
        }
        if (pred.type === 'recolte' && pred.dateMin <= in7 && pred.dateMin >= today) {
          alerts.push({
            type: 'success',
            icon: '🧺',
            title: `${dbPlant.emoji} ${name} — Récolte imminente`,
            text: `Récolte estimée à partir du ${Utils.formatDate(pred.dateMin)}`
          });
        }
      });

      // Check germination expected
      if (up.currentStage === 'semis_interieur' || up.currentStage === 'semis_exterieur') {
        const daysSince = Utils.daysBetween(up.stageDate, today);
        const germMax = dbPlant.germination_days?.max || 21;
        if (daysSince > germMax + 3) {
          alerts.push({
            type: 'danger',
            icon: '⚠️',
            title: `${dbPlant.emoji} ${name} — Germination tardive`,
            text: `Semé il y a ${daysSince} jours, la germination attendue était dans ${germMax} jours max.`
          });
        }
      }
    });

    return alerts;
  }
};
