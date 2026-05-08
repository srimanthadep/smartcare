import { dbService } from './db.service.js';

class ActivityService {
  async log(userId, userName, action, details, ip = '') {
    const id = `LOG${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const query = `
      INSERT INTO activity_logs (id, user_id, user_name, action, details, ip)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const params = [id, userId, userName, action, details, ip];
    
    try {
      await dbService.query(query, params);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }
}

export const activityService = new ActivityService();
