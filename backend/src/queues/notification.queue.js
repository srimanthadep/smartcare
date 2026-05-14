// ─────────────────────────────────────────────────────────────────────────────
// Notification Queue — Appointment reminders, recall notifications
// Hosts the repeatable cron job for daily appointment reminders.
// ─────────────────────────────────────────────────────────────────────────────
import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

export const NOTIFICATION_JOBS = {
  APPOINTMENT_REMINDERS: 'appointment-reminders',
  RECALL_REMINDER: 'recall-reminder',
};

let notificationQueue = null;

export const getNotificationQueue = () => {
  if (notificationQueue) return notificationQueue;

  const connection = getRedisConnection();
  if (!connection) return null;

  notificationQueue = new Queue('notification', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { age: 86400, count: 100 },
      removeOnFail: { age: 604800, count: 200 },
    },
  });

  return notificationQueue;
};

export const addNotificationJob = async (jobName, data = {}, opts = {}) => {
  const queue = getNotificationQueue();
  if (!queue) return null;

  try {
    return await queue.add(jobName, data, opts);
  } catch (err) {
    console.error(`⚠️  Failed to enqueue notification job [${jobName}]:`, err.message);
    return null;
  }
};
