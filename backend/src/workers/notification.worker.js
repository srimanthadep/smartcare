// ─────────────────────────────────────────────────────────────────────────────
// Notification Worker — Appointment reminders (daily cron) and recall reminders
// Uses WhatsApp service to send reminders to patients with tomorrow's appointments.
// ─────────────────────────────────────────────────────────────────────────────
import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { dbService } from '../services/db.service.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { NOTIFICATION_JOBS } from '../queues/notification.queue.js';

let worker = null;

export const startNotificationWorker = () => {
  const connection = getRedisConnection();
  if (!connection) return null;

  worker = new Worker('notification', async (job) => {
    const { name, id, attemptsMade } = job;
    console.log(`🔔 [Notification Worker] Processing ${name} (job:${id}, attempt:${attemptsMade + 1})`);

    switch (name) {
      case NOTIFICATION_JOBS.APPOINTMENT_REMINDERS: {
        console.log('📅 Sending appointment reminders for tomorrow...');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const result = await dbService.query(`
          SELECT a.time, a.type, p.name, p.phone
          FROM appointments a
          JOIN patients p ON a.patient_id = p.id
          WHERE a.date = $1 AND a.status != 'Cancelled'
        `, [tomorrowStr]);

        if (result.rows.length === 0) {
          console.log('📅 No appointments tomorrow — skipping reminders.');
          return { sent: 0, total: 0 };
        }

        let sent = 0;
        for (const appt of result.rows) {
          try {
            await whatsappService.sendReminder(appt);
            sent++;
          } catch (e) {
            console.error(`WA reminder failed for ${appt.name}:`, e.message);
          }
        }

        console.log(`✅ Sent ${sent}/${result.rows.length} appointment reminders`);
        return { sent, total: result.rows.length };
      }

      default:
        console.warn(`🔔 [Notification Worker] Unknown job type: ${name}`);
        return { skipped: true };
    }
  }, {
    connection,
    concurrency: 2,
  });

  worker.on('completed', (job) => {
    console.log(`✅ [Notification Worker] Job ${job.name}:${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Notification Worker] Job ${job?.name}:${job?.id} failed: ${err.message}`);
  });

  console.log('🔔 Notification worker started (concurrency: 2)');
  return worker;
};

export const stopNotificationWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};
