import { dbService } from './db.service.js';
import { emitEvent, SOCKET_EVENTS } from './socket.service.js';
import { addActivityJob, ACTIVITY_JOBS } from '../queues/activity.queue.js';

class ActivityService {
  /**
   * Log an activity event. Enqueues to BullMQ for async processing.
   * Falls back to direct DB write if Redis is unavailable.
   */
  async log(userId, userName, action, details, ip = '') {
    // Try to enqueue via BullMQ first (non-blocking)
    const job = await addActivityJob(ACTIVITY_JOBS.LOG, { userId, userName, action, details, ip });
    
    if (job) return; // Successfully queued — worker will handle it

    // Fallback: direct DB write if Redis is unavailable
    const id = `LOG${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    
    try {
      await dbService.query(
        'INSERT INTO activity_logs (id, user_id, user_name, action, details, ip) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, userId, userName, action, details, ip]
      );
      emitEvent(SOCKET_EVENTS.ACTIVITY_LOGGED, { id, userId, userName, action, details, ip, timestamp });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }
}

export const activityService = new ActivityService();
