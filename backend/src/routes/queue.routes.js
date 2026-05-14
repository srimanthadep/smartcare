// ─────────────────────────────────────────────────────────────────────────────
// Queue Stats API — Returns metrics for all BullMQ queues
// Used by the frontend Bull Dashboard page.
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import { getEmailQueue } from '../queues/email.queue.js';
import { getWhatsAppQueue } from '../queues/whatsapp.queue.js';
import { getBackupQueue } from '../queues/backup.queue.js';
import { getNotificationQueue } from '../queues/notification.queue.js';
import { getActivityQueue } from '../queues/activity.queue.js';

const router = Router();

/**
 * Helper: Get comprehensive stats for a single queue
 */
async function getQueueStats(queue) {
  if (!queue) return null;

  const [jobCounts, repeatableJobs] = await Promise.all([
    queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
    queue.getRepeatableJobs(),
  ]);

  // Get recent completed jobs (last 20)
  const recentCompleted = await queue.getCompleted(0, 19);
  const recentFailed = await queue.getFailed(0, 19);

  return {
    name: queue.name,
    counts: {
      waiting: jobCounts.waiting || 0,
      active: jobCounts.active || 0,
      completed: jobCounts.completed || 0,
      failed: jobCounts.failed || 0,
      delayed: jobCounts.delayed || 0,
      paused: jobCounts.paused || 0,
    },
    isPaused: await queue.isPaused(),
    repeatableJobs: repeatableJobs.map(j => ({
      key: j.key,
      name: j.name,
      id: j.id,
      pattern: j.pattern,
      next: j.next,
      tz: j.tz,
    })),
    recentCompleted: recentCompleted.map(j => ({
      id: j.id,
      name: j.name,
      finishedOn: j.finishedOn,
      processedOn: j.processedOn,
      duration: j.finishedOn && j.processedOn ? j.finishedOn - j.processedOn : null,
      returnvalue: j.returnvalue,
      attemptsMade: j.attemptsMade,
    })),
    recentFailed: recentFailed.map(j => ({
      id: j.id,
      name: j.name,
      failedReason: j.failedReason,
      finishedOn: j.finishedOn,
      processedOn: j.processedOn,
      attemptsMade: j.attemptsMade,
      timestamp: j.timestamp,
    })),
  };
}

/**
 * GET /api/queues/stats — Returns stats for all queues
 */
router.get('/stats', async (req, res, next) => {
  try {
    const queues = [
      { getter: getEmailQueue, icon: '📧', label: 'Email' },
      { getter: getWhatsAppQueue, icon: '💬', label: 'WhatsApp' },
      { getter: getBackupQueue, icon: '📦', label: 'Backup' },
      { getter: getNotificationQueue, icon: '🔔', label: 'Notification' },
      { getter: getActivityQueue, icon: '📝', label: 'Activity' },
    ];

    const results = [];
    for (const q of queues) {
      const queue = q.getter();
      if (!queue) continue;
      const stats = await getQueueStats(queue);
      if (stats) {
        results.push({ ...stats, icon: q.icon, label: q.label });
      }
    }

    res.json({
      queues: results,
      timestamp: new Date().toISOString(),
      redisConnected: results.length > 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queues/:name/pause — Pause a queue
 */
router.post('/:name/pause', async (req, res, next) => {
  try {
    const queue = getQueueByName(req.params.name);
    if (!queue) return res.status(404).json({ message: 'Queue not found' });
    await queue.pause();
    res.json({ message: `Queue "${req.params.name}" paused`, paused: true });
  } catch (error) { next(error); }
});

/**
 * POST /api/queues/:name/resume — Resume a queue
 */
router.post('/:name/resume', async (req, res, next) => {
  try {
    const queue = getQueueByName(req.params.name);
    if (!queue) return res.status(404).json({ message: 'Queue not found' });
    await queue.resume();
    res.json({ message: `Queue "${req.params.name}" resumed`, paused: false });
  } catch (error) { next(error); }
});

/**
 * POST /api/queues/:name/clean — Clean completed/failed jobs
 */
router.post('/:name/clean', async (req, res, next) => {
  try {
    const queue = getQueueByName(req.params.name);
    if (!queue) return res.status(404).json({ message: 'Queue not found' });
    const { status = 'completed', grace = 0 } = req.body;
    const cleaned = await queue.clean(grace, 1000, status);
    res.json({ message: `Cleaned ${cleaned.length} ${status} jobs from "${req.params.name}"`, cleaned: cleaned.length });
  } catch (error) { next(error); }
});

/**
 * POST /api/queues/:name/retry-all — Retry all failed jobs
 */
router.post('/:name/retry-all', async (req, res, next) => {
  try {
    const queue = getQueueByName(req.params.name);
    if (!queue) return res.status(404).json({ message: 'Queue not found' });
    const failed = await queue.getFailed(0, 1000);
    let retried = 0;
    for (const job of failed) {
      await job.retry();
      retried++;
    }
    res.json({ message: `Retried ${retried} failed jobs in "${req.params.name}"`, retried });
  } catch (error) { next(error); }
});

function getQueueByName(name) {
  const map = {
    email: getEmailQueue,
    whatsapp: getWhatsAppQueue,
    backup: getBackupQueue,
    notification: getNotificationQueue,
    activity: getActivityQueue,
  };
  return map[name]?.() || null;
}

export default router;
