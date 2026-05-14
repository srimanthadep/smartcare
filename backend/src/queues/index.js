// ─────────────────────────────────────────────────────────────────────────────
// Queue Index — Initializes all queues, registers Bull Board, sets up repeatables
// ─────────────────────────────────────────────────────────────────────────────
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { getEmailQueue } from './email.queue.js';
import { getWhatsAppQueue } from './whatsapp.queue.js';
import { getBackupQueue, BACKUP_JOBS } from './backup.queue.js';
import { getNotificationQueue, NOTIFICATION_JOBS } from './notification.queue.js';
import { getActivityQueue } from './activity.queue.js';
import { getRedisConnection } from '../config/redis.js';

// Bull Board Express adapter — mounted at /api/admin/queues
export const bullBoardAdapter = new ExpressAdapter();
bullBoardAdapter.setBasePath('/api/admin/queues');

/**
 * Initialize all queues and register repeatable cron jobs.
 * Called once during server startup after Redis connection is verified.
 */
export const initQueues = async () => {
  const conn = getRedisConnection();
  if (!conn) {
    console.warn('⚠️  Redis unavailable — queues not initialized');
    return false;
  }

  // Create all queue instances
  const emailQueue = getEmailQueue();
  const whatsappQueue = getWhatsAppQueue();
  const backupQueue = getBackupQueue();
  const notificationQueue = getNotificationQueue();
  const activityQueue = getActivityQueue();

  // Register Bull Board monitoring dashboard
  const queues = [emailQueue, whatsappQueue, backupQueue, notificationQueue, activityQueue]
    .filter(Boolean)
    .map(q => new BullMQAdapter(q));

  createBullBoard({
    queues,
    serverAdapter: bullBoardAdapter,
  });

  // ── Register repeatable/cron jobs ──
  // BullMQ deduplicates repeatables by key, so calling this on every startup is safe.

  if (backupQueue) {
    // Daily backup at 2:00 AM IST
    await backupQueue.add(BACKUP_JOBS.SCHEDULED_BACKUP, {}, {
      repeat: { pattern: '0 2 * * *', tz: 'Asia/Kolkata' },
      jobId: 'daily-backup-cron',
    });
    console.log('⏰ Repeatable: Daily backup at 2:00 AM IST');
  }

  if (notificationQueue) {
    // Daily appointment reminders at 9:00 AM IST
    await notificationQueue.add(NOTIFICATION_JOBS.APPOINTMENT_REMINDERS, {}, {
      repeat: { pattern: '0 9 * * *', tz: 'Asia/Kolkata' },
      jobId: 'daily-reminders-cron',
    });
    console.log('⏰ Repeatable: Appointment reminders at 9:00 AM IST');
  }

  console.log('✅ All BullMQ queues initialized');
  return true;
};
