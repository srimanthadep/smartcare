// ─────────────────────────────────────────────────────────────────────────────
// Activity Worker — Processes activity log DB writes and medicine saving
// High concurrency (5) since these are fast, low-impact DB inserts.
// ─────────────────────────────────────────────────────────────────────────────
import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { dbService } from '../services/db.service.js';
import { emitEvent, SOCKET_EVENTS } from '../services/socket.service.js';
import { ACTIVITY_JOBS } from '../queues/activity.queue.js';

let worker = null;

export const startActivityWorker = () => {
  const connection = getRedisConnection();
  if (!connection) return null;

  worker = new Worker('activity', async (job) => {
    const { name, data } = job;

    switch (name) {
      case ACTIVITY_JOBS.LOG: {
        const { userId, userName, action, details, ip } = data;
        const id = `LOG${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const timestamp = new Date().toISOString();

        await dbService.query(
          'INSERT INTO activity_logs (id, user_id, user_name, action, details, ip) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, userId, userName, action, details, ip]
        );

        emitEvent(SOCKET_EVENTS.ACTIVITY_LOGGED, { id, userId, userName, action, details, ip, timestamp });
        return { logged: true };
      }

      case ACTIVITY_JOBS.SAVE_MEDICINES: {
        const { medicines } = data;
        if (!medicines || !Array.isArray(medicines)) return { skipped: true };

        for (const med of medicines) {
          if (!med.name) continue;
          try {
            await dbService.query(`
              INSERT INTO saved_medicines (name, dose, frequency, duration, updated_at)
              VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
              ON CONFLICT (name) DO UPDATE SET
                dose = EXCLUDED.dose,
                frequency = EXCLUDED.frequency,
                duration = EXCLUDED.duration,
                updated_at = CURRENT_TIMESTAMP
            `, [med.name, med.dosage || '', med.frequency || '', med.duration || '']);
          } catch (err) {
            console.error('Error saving medicine:', err);
          }
        }

        return { saved: medicines.length };
      }

      default:
        return { skipped: true };
    }
  }, {
    connection,
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Activity Worker] Job ${job?.name}:${job?.id} failed: ${err.message}`);
  });

  console.log('📝 Activity worker started (concurrency: 5)');
  return worker;
};

export const stopActivityWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};
