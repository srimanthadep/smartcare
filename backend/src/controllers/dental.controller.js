import { dbService } from '../services/db.service.js';
import { activityService } from '../services/activity.service.js';

export const getDentalChart = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const db = await dbService.read();
    const chart = db.dentalCharts.find(c => c.patientId === patientId);
    res.json(chart || { patientId, teeth: [], lastUpdated: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
};

export const updateDentalChart = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { teeth } = req.body;
    const db = await dbService.read();
    
    const index = db.dentalCharts.findIndex(c => c.patientId === patientId);
    const chart = {
      patientId,
      teeth: Array.isArray(teeth) ? teeth : [],
      lastUpdated: new Date().toISOString()
    };

    if (index === -1) db.dentalCharts.push(chart);
    else db.dentalCharts[index] = chart;

    await dbService.write(db);
    await activityService.log(req.user.sub, req.user.email, 'Update Dental Chart', `Updated dental chart for patient ${patientId}`, req.ip);
    
    res.json(chart);
  } catch (error) {
    next(error);
  }
};
