// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Worker — Processes welcome, invoice, prescription, reminder messages
// Concurrency: 1 — WhatsApp has strict rate limits, sequential is safer.
// ─────────────────────────────────────────────────────────────────────────────
import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { WHATSAPP_JOBS } from '../queues/whatsapp.queue.js';

let worker = null;

export const startWhatsAppWorker = () => {
  const connection = getRedisConnection();
  if (!connection) return null;

  worker = new Worker('whatsapp', async (job) => {
    const { name, data, id, attemptsMade } = job;
    console.log(`💬 [WhatsApp Worker] Processing ${name} (job:${id}, attempt:${attemptsMade + 1})`);

    switch (name) {
      case WHATSAPP_JOBS.WELCOME: {
        await whatsappService.sendWelcome(data.patient);
        return { sent: true };
      }

      case WHATSAPP_JOBS.INVOICE: {
        await whatsappService.sendInvoice(data.patient, data.invoice);
        return { sent: true };
      }

      case WHATSAPP_JOBS.PRESCRIPTION: {
        await whatsappService.sendPrescription(data.patient, data.prescription);
        return { sent: true };
      }

      case WHATSAPP_JOBS.REMINDER: {
        await whatsappService.sendReminder(data.appointment);
        return { sent: true };
      }

      default:
        console.warn(`💬 [WhatsApp Worker] Unknown job type: ${name}`);
        return { skipped: true };
    }
  }, {
    connection,
    concurrency: 1,
  });

  worker.on('completed', (job) => {
    console.log(`✅ [WhatsApp Worker] Job ${job.name}:${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [WhatsApp Worker] Job ${job?.name}:${job?.id} failed: ${err.message}`);
  });

  console.log('💬 WhatsApp worker started (concurrency: 1)');
  return worker;
};

export const stopWhatsAppWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};
