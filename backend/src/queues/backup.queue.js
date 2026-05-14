// ─────────────────────────────────────────────────────────────────────────────
// Backup Queue — Database backup generation and email delivery
// Concurrency: 1 (only one backup should run at a time)
// Also hosts the repeatable cron job for scheduled backups.
// ─────────────────────────────────────────────────────────────────────────────
import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

export const BACKUP_JOBS = {
  SCHEDULED_BACKUP: 'scheduled-backup',
  MANUAL_BACKUP: 'manual-backup',
};

let backupQueue = null;

export const getBackupQueue = () => {
  if (backupQueue) return backupQueue;

  const connection = getRedisConnection();
  if (!connection) return null;

  backupQueue = new Queue('backup', {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 30000 },
      removeOnComplete: { age: 604800, count: 50 },  // Keep 7 days
      removeOnFail: { age: 2592000, count: 100 },     // Keep 30 days
    },
  });

  return backupQueue;
};

export const addBackupJob = async (jobName, data = {}, opts = {}) => {
  const queue = getBackupQueue();
  if (!queue) return null;

  try {
    return await queue.add(jobName, data, opts);
  } catch (err) {
    console.error(`⚠️  Failed to enqueue backup job [${jobName}]:`, err.message);
    return null;
  }
};
