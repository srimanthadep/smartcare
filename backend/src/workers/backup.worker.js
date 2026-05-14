// ─────────────────────────────────────────────────────────────────────────────
// Backup Worker — Processes scheduled and manual database backups
// Concurrency: 1 — only one backup should run at a time.
// ─────────────────────────────────────────────────────────────────────────────
import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { performFullBackup, runScheduledBackupIfDue } from '../services/backupService.js';
import { BACKUP_JOBS } from '../queues/backup.queue.js';

let worker = null;

export const startBackupWorker = () => {
  const connection = getRedisConnection();
  if (!connection) return null;

  worker = new Worker('backup', async (job) => {
    const { name, id, attemptsMade } = job;
    console.log(`📦 [Backup Worker] Processing ${name} (job:${id}, attempt:${attemptsMade + 1})`);

    switch (name) {
      case BACKUP_JOBS.SCHEDULED_BACKUP: {
        // The scheduled backup checks its own due-date logic
        await runScheduledBackupIfDue();
        return { completed: true, type: 'scheduled' };
      }

      case BACKUP_JOBS.MANUAL_BACKUP: {
        const zipFile = await performFullBackup();
        return { completed: true, type: 'manual', file: zipFile };
      }

      default:
        console.warn(`📦 [Backup Worker] Unknown job type: ${name}`);
        return { skipped: true };
    }
  }, {
    connection,
    concurrency: 1,
  });

  worker.on('completed', (job) => {
    console.log(`✅ [Backup Worker] Job ${job.name}:${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Backup Worker] Job ${job?.name}:${job?.id} failed: ${err.message}`);
  });

  console.log('📦 Backup worker started (concurrency: 1)');
  return worker;
};

export const stopBackupWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};
