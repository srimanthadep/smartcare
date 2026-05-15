// ─────────────────────────────────────────────────────────────────────────────
// Worker Index — Starts and stops all BullMQ workers
// Called from server.js during startup and shutdown.
// ─────────────────────────────────────────────────────────────────────────────
import { startEmailWorker, stopEmailWorker } from './email.worker.js';
import { startWhatsAppWorker, stopWhatsAppWorker } from './whatsapp.worker.js';
import { startBackupWorker, stopBackupWorker } from './backup.worker.js';
import { startNotificationWorker, stopNotificationWorker } from './notification.worker.js';
import { startActivityWorker, stopActivityWorker } from './activity.worker.js';
import './fixedExpense.worker.js'; // Registers cron job
import { getRedisConnection } from '../config/redis.js';

/**
 * Start all worker processors.
 * Each worker returns null if Redis is unavailable — no crash.
 */
export const startWorkers = () => {
  const conn = getRedisConnection();
  if (!conn) {
    console.warn('⚠️  Redis unavailable — workers not started');
    return;
  }

  startEmailWorker();
  startWhatsAppWorker();
  startBackupWorker();
  startNotificationWorker();
  startActivityWorker();

  console.log('✅ All BullMQ workers started');
};

/**
 * Gracefully stop all workers. Called on SIGTERM/SIGINT.
 * BullMQ workers finish their current job before shutting down.
 */
export const stopWorkers = async () => {
  console.log('🛑 Shutting down BullMQ workers...');

  await Promise.allSettled([
    stopEmailWorker(),
    stopWhatsAppWorker(),
    stopBackupWorker(),
    stopNotificationWorker(),
    stopActivityWorker(),
  ]);

  console.log('✅ All workers stopped');
};
