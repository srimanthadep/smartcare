// ─────────────────────────────────────────────────────────────────────────────
// Activity Queue — Activity log writes + medicine saving
// High concurrency (5) since these are fast DB inserts.
// ─────────────────────────────────────────────────────────────────────────────
import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

export const ACTIVITY_JOBS = {
  LOG: 'activity-log',
  SAVE_MEDICINES: 'save-medicines',
};

let activityQueue = null;

export const getActivityQueue = () => {
  if (activityQueue) return activityQueue;

  const connection = getRedisConnection();
  if (!connection) return null;

  activityQueue = new Queue('activity', {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 1000 },
      removeOnComplete: { age: 43200, count: 500 },   // Keep 12h
      removeOnFail: { age: 259200, count: 200 },       // Keep 3 days
    },
  });

  return activityQueue;
};

export const addActivityJob = async (jobName, data, opts = {}) => {
  const queue = getActivityQueue();
  if (!queue) return null;

  try {
    return await queue.add(jobName, data, opts);
  } catch (err) {
    console.error(`⚠️  Failed to enqueue activity job [${jobName}]:`, err.message);
    return null;
  }
};
