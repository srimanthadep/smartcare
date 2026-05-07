import { dbService } from './db.service.js';

class ActivityService {
  async log(userId, userName, action, details, ip = '') {
    const db = await dbService.read();
    const log = {
      id: `LOG${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      userName,
      action,
      details,
      timestamp: new Date().toISOString(),
      ip,
    };
    
    db.activityLogs.unshift(log);
    if (db.activityLogs.length > 5000) {
      db.activityLogs = db.activityLogs.slice(0, 5000);
    }
    
    await dbService.write(db);
  }
}

export const activityService = new ActivityService();
