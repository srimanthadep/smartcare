// ─────────────────────────────────────────────────────────────────────────────
// Email Queue — Handles welcome emails, prescription emails, invoice emails
// All email operations are fire-and-forget from the controller's perspective.
// ─────────────────────────────────────────────────────────────────────────────
import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

export const EMAIL_JOBS = {
  WELCOME: 'welcome-email',
  PRESCRIPTION: 'prescription-email',
  INVOICE: 'invoice-email',
  BACKUP: 'backup-email',
};

let emailQueue = null;

export const getEmailQueue = () => {
  if (emailQueue) return emailQueue;

  const connection = getRedisConnection();
  if (!connection) return null;

  emailQueue = new Queue('email', {
    connection,
    defaultJobOptions: {
      attempts: 4,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400, count: 200 },  // Keep completed for 24h, max 200
      removeOnFail: { age: 604800, count: 500 },      // Keep failed for 7 days
    },
  });

  return emailQueue;
};

/**
 * Enqueue an email job. Safe to call even if Redis is unavailable — silently skips.
 */
export const addEmailJob = async (jobName, data, opts = {}) => {
  const queue = getEmailQueue();
  if (!queue) return null;

  try {
    return await queue.add(jobName, data, opts);
  } catch (err) {
    console.error(`⚠️  Failed to enqueue email job [${jobName}]:`, err.message);
    return null;
  }
};
