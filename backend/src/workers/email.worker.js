// ─────────────────────────────────────────────────────────────────────────────
// Email Worker — Processes all email jobs (welcome, prescription, invoice, backup)
// Uses the existing emailService methods — no logic changes, just decoupled execution.
// ─────────────────────────────────────────────────────────────────────────────
import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { emailService } from '../services/email.service.js';
import { EMAIL_JOBS } from '../queues/email.queue.js';

let worker = null;

export const startEmailWorker = () => {
  const connection = getRedisConnection();
  if (!connection) return null;

  worker = new Worker('email', async (job) => {
    const { name, data, id, attemptsMade } = job;
    console.log(`📧 [Email Worker] Processing ${name} (job:${id}, attempt:${attemptsMade + 1})`);

    switch (name) {
      case EMAIL_JOBS.WELCOME: {
        const { patient } = data;
        if (!patient?.email) {
          console.log(`📧 [Email Worker] Skipping ${name} — no email for patient`);
          return { skipped: true, reason: 'no-email' };
        }
        const result = await emailService.sendWelcomeEmail(patient);
        console.log(`✅ [Email Worker] Welcome email sent to ${patient.email}`);
        return result;
      }

      case EMAIL_JOBS.PRESCRIPTION: {
        const { patient, prescription } = data;
        if (!patient?.email) return { skipped: true, reason: 'no-email' };
        const result = await emailService.sendPrescriptionEmail(patient, prescription);
        console.log(`✅ [Email Worker] Prescription email sent to ${patient.email}`);
        return result;
      }

      case EMAIL_JOBS.INVOICE: {
        const { patient, invoice } = data;
        if (!patient?.email) return { skipped: true, reason: 'no-email' };
        const result = await emailService.sendInvoiceEmail(patient, invoice);
        console.log(`✅ [Email Worker] Invoice email sent to ${patient.email}`);
        return result;
      }

      default:
        console.warn(`📧 [Email Worker] Unknown job type: ${name}`);
        return { skipped: true, reason: 'unknown-job' };
    }
  }, {
    connection,
    concurrency: 3,
    limiter: { max: 10, duration: 60000 },  // Max 10 emails per minute (Resend limits)
  });

  worker.on('completed', (job) => {
    console.log(`✅ [Email Worker] Job ${job.name}:${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Email Worker] Job ${job?.name}:${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
  });

  console.log('📧 Email worker started (concurrency: 3)');
  return worker;
};

export const stopEmailWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};
