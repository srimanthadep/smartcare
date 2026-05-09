import { dbService } from '../services/db.service.js';
import { activityService } from '../services/activity.service.js';

export const getDentalChart = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const result = await dbService.query('SELECT * FROM dental_charts WHERE patient_id = $1', [patientId]);
    
    if (result.rows.length === 0) {
      return res.json({ patientId, teeth: [], lastUpdated: new Date().toISOString() });
    }
    
    const chart = dbService.mapRows('dental_charts', result.rows)[0];
    res.json(chart);
  } catch (error) {
    next(error);
  }
};

export const updateDentalChart = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { teeth } = req.body;
    
    const query = `
      INSERT INTO dental_charts (patient_id, teeth, last_updated)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (patient_id) DO UPDATE SET
        teeth = EXCLUDED.teeth,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await dbService.query(query, [patientId, JSON.stringify(teeth || [])]);
    const chart = dbService.mapRows('dental_charts', result.rows)[0];

    await activityService.log(req.user.sub, req.user.username, 'Update Dental Chart', `Updated dental chart for patient ${patientId}`, req.ip);
    
    res.json(chart);
  } catch (error) {
    next(error);
  }
};
