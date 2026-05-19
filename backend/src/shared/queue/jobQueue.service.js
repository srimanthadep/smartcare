import { dbService } from '../../core/db/db.service.js';
import { emitEvent, SOCKET_EVENTS } from '../sockets/socket.service.js';
import { sqliteQueue } from './sqliteQueue.service.js';

const queue = [];
let activeCount = 0;
const CONCURRENCY_LIMIT = 5;

// ── Queue Stats Tracking ─────────────────────────────────────────────────────
let completedCount = 0;
let failedCount = 0;
const recentCompleted = [];
const recentFailed = [];
const MAX_RECENT = 50;

const processNext = async () => {
  if (activeCount >= CONCURRENCY_LIMIT || queue.length === 0) return;
  
  const job = queue.shift();
  activeCount++;
  const startTime = Date.now();
  
  // Trigger next check immediately to fill capacity
  setImmediate(processNext);
  
  try {
    console.log(`[JobQueue] Starting job: ${job.label} (Active: ${activeCount})`);
    await job.fn();
    const duration = Date.now() - startTime;
    console.log(`[JobQueue] Completed job: ${job.label} in ${duration}ms (Active: ${activeCount - 1})`);
    completedCount++;
    recentCompleted.unshift({ id: `job_${Date.now()}`, name: job.label, duration, finishedOn: Date.now() });
    if (recentCompleted.length > MAX_RECENT) recentCompleted.pop();
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[JobQueue] Error in job ${job.label} after ${duration}ms:`, err);
    failedCount++;
    recentFailed.unshift({ id: `job_${Date.now()}`, name: job.label, duration, failedReason: err.message, finishedOn: Date.now() });
    if (recentFailed.length > MAX_RECENT) recentFailed.pop();
  } finally {
    activeCount--;
    setImmediate(processNext);
  }
};

export const enqueue = (label, fn) => {
  queue.push({ label, fn });
  setImmediate(processNext);
};

export const sendWhatsAppJob = (label, fn) => enqueue(label, fn);
export const sendEmailJob = (label, fn) => enqueue(label, fn);

export const logActivity = async ({ userId, userName, action, details, ip = '' }) => {
  // Enqueue activity logging to background queue for non-blocking behavior
  try {
    sqliteQueue.enqueue('background', 'logActivity', { userId, userName, action, details, ip });
  } catch (err) {
    console.error('[JobQueue] Failed to enqueue activity log:', err);
  }
};

export const saveMedicines = (medicines) => {
  enqueue('save-medicines', async () => {
    for (const med of medicines) {
      if (!med.name) continue;
      await dbService.query(
        `INSERT INTO saved_medicines (name, type, instructions) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (name) DO UPDATE 
         SET type = EXCLUDED.type, instructions = EXCLUDED.instructions`,
        [med.name, med.type || 'Tablet', med.instructions || '']
      );
    }
  });
};

// ── Queue Stats Export ────────────────────────────────────────────────────────
export const getQueueStats = () => ({
  pending: queue.length,
  active: activeCount,
  completed: completedCount,
  failed: failedCount,
  concurrencyLimit: CONCURRENCY_LIMIT,
  recentCompleted: recentCompleted.slice(0, 20),
  recentFailed: recentFailed.slice(0, 20),
});

