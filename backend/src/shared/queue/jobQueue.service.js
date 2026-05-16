import { dbService } from '../../core/db/db.service.js';
import { emitEvent, SOCKET_EVENTS } from '../sockets/socket.service.js';

const queue = [];
let activeCount = 0;
const CONCURRENCY_LIMIT = 5;

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
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[JobQueue] Error in job ${job.label} after ${duration}ms:`, err);
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
  const id = `LOG${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();
  
  try {
    await dbService.query(
      'INSERT INTO activity_logs (id, user_id, user_name, action, details, ip) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, userId, userName, action, details, ip]
    );
    emitEvent(SOCKET_EVENTS.ACTIVITY_LOGGED, { id, userId, userName, action, details, ip, timestamp });
  } catch (err) {
    console.error('[JobQueue] Failed to log activity:', err);
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
