// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Queue — Welcome messages, invoice/prescription PDFs via WhatsApp
// Concurrency: 1 (WhatsApp has strict rate limits, sequential is safer)
// ─────────────────────────────────────────────────────────────────────────────
import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { whatsappService } from '../services/whatsapp.service.js';

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
  
  if (queue) {
    try {
      return await queue.add(jobName, data, opts);
    } catch (err) {
      console.error(`⚠️  Redis Queue failed for WhatsApp [${jobName}]: ${err.message}. Switching to Direct Send.`);
    }
  }

  // Fallback: Direct synchronous send if Redis is down or Queue fails
  try {
    console.log(`📡 [WhatsApp Fallback] Attempting direct send for ${jobName}...`);
    switch (jobName) {
      case WHATSAPP_JOBS.WELCOME:
        return await whatsappService.sendWelcome(data.patient);
      case WHATSAPP_JOBS.INVOICE:
        return await whatsappService.sendInvoice(data.patient, data.invoice);
      case WHATSAPP_JOBS.PRESCRIPTION:
        return await whatsappService.sendPrescription(data.patient, data.prescription);
      case WHATSAPP_JOBS.REMINDER:
        return await whatsappService.sendReminder(data.appointment);
      default:
        console.warn(`⚠️  [WhatsApp Fallback] No direct handler for ${jobName}`);
        return null;
    }
  } catch (directErr) {
    console.error(`❌ [WhatsApp Fallback] Direct send failed for ${jobName}:`, directErr.message);
    return null;
  }
};
