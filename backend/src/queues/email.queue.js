// ─────────────────────────────────────────────────────────────────────────────
// Email Queue — Handles welcome emails, prescription emails, invoice emails
// All email operations are fire-and-forget from the controller's perspective.
// ─────────────────────────────────────────────────────────────────────────────
import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { emailService } from '../services/email.service.js';

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
 * Enqueue an email job. Safe to call even if Redis is unavailable — fallbacks to direct send.
 */
export const addEmailJob = async (jobName, data, opts = {}) => {
  const queue = getEmailQueue();
  
  if (queue) {
    try {
      return await queue.add(jobName, data, opts);
    } catch (err) {
      console.error(`⚠️  Redis Queue failed [${jobName}]: ${err.message}. Switching to Direct Send.`);
    }
  }

  // Fallback: Direct synchronous send if Redis is down or Queue fails
  try {
    console.log(`📡 [Email Fallback] Attempting direct send for ${jobName}...`);
    switch (jobName) {
      case EMAIL_JOBS.WELCOME:
        return await emailService.sendWelcomeEmail(data.patient);
      case EMAIL_JOBS.PRESCRIPTION:
        return await emailService.sendPrescriptionEmail(data.patient, data.prescription);
      case EMAIL_JOBS.INVOICE:
        return await emailService.sendInvoiceEmail(data.patient, data.invoice);
      default:
        console.warn(`⚠️  [Email Fallback] No direct handler for ${jobName}`);
        return null;
    }
  } catch (directErr) {
    console.error(`❌ [Email Fallback] Direct send failed for ${jobName}:`, directErr.message);
    return null;
  }
};
