// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Queue — Welcome messages, invoice/prescription PDFs via WhatsApp
// Concurrency: 1 (WhatsApp has strict rate limits, sequential is safer)
// ─────────────────────────────────────────────────────────────────────────────
import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

export const WHATSAPP_JOBS = {
  WELCOME: 'whatsapp-welcome',
  INVOICE: 'whatsapp-invoice',
  PRESCRIPTION: 'whatsapp-prescription',
  REMINDER: 'whatsapp-reminder',
};

let whatsappQueue = null;

export const getWhatsAppQueue = () => {
  if (whatsappQueue) return whatsappQueue;

  const connection = getRedisConnection();
  if (!connection) return null;

  whatsappQueue = new Queue('whatsapp', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400, count: 200 },
      removeOnFail: { age: 604800, count: 500 },
    },
  });

  return whatsappQueue;
};

export const addWhatsAppJob = async (jobName, data, opts = {}) => {
  const queue = getWhatsAppQueue();
  if (!queue) return null;

  try {
    return await queue.add(jobName, data, opts);
  } catch (err) {
    console.error(`⚠️  Failed to enqueue WhatsApp job [${jobName}]:`, err.message);
    return null;
  }
};
