import { dbService } from '../services/db.service.js';

export const getActivityLogs = async (req, res, next) => {
  try {
    const result = await dbService.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100');
    res.json(dbService.mapRows('activity_logs', result.rows));
  } catch (error) {
    next(error);
  }
};
