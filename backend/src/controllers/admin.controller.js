import { dbService } from '../services/db.service.js';

export const getActivityLogs = async (req, res, next) => {
  try {
    const db = await dbService.read();
    res.json(db.activityLogs);
  } catch (error) {
    next(error);
  }
};
