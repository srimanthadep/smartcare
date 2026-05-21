import { sqliteQueue } from '../../shared/queue/sqliteQueue.service.js';
import { getSocket, getStatus, initWhatsApp, performSend } from './whatsapp.service.js';
import { mediaCacheService } from '../../shared/services/mediaCache.service.js';
import { cloudinary, getThumbnailUrl } from '../../core/config/cloudinary.js';

const SOCKET_NAMES = ['invoices', 'reminders', 'reports'];
const rateLimits = new Map();
const WAIT_FOR_CONNECTION_MS = 30000;
const STALE_JOB_MS = 5 * 60 * 1000;

const createSocketFor = async (name) => {
  if (!rateLimits.has(name)) {
    rateLimits.set(name, { tokens: 5, lastRefill: Date.now(), rate: 5 });
  }

  const { status } = getStatus();
  const socket = getSocket();
  if (status === 'connected' && socket) return socket;

  if (status === 'disconnected') {
    initWhatsApp().catch((err) => console.error('[WhatsApp Worker] reconnect failed:', err.message));
  }

  return null;
};

const selectSocket = (action) => {
  if (action.toLowerCase().includes('invoice')) return 'invoices';
  if (action.toLowerCase().includes('remind')) return 'reminders';
  return 'reports';
};

const ensureRate = (name) => {
  const rl = rateLimits.get(name);
  if (!rl) return false;
  const now = Date.now();
  const seconds = Math.floor((now - rl.lastRefill) / 1000);
  if (seconds > 0) {
    rl.tokens = Math.min(rl.rate, rl.tokens + seconds * rl.rate);
    rl.lastRefill = now;
  }
  if (rl.tokens > 0) {
    rl.tokens -= 1;
    return true;
  }
  return false;
};

const processTextQueue = async () => {
  try {
    const job = sqliteQueue.fetchNext('text');
    if (!job) return;
    const name = selectSocket(job.action || 'text');
    const socket = await createSocketFor(name);
    if (!socket) {
      sqliteQueue.requeue(job.id, WAIT_FOR_CONNECTION_MS, 'WhatsApp is not connected');
      console.warn(`[WhatsApp Worker] ${job.action} job ${job.id} waiting for connected WhatsApp session`);
      return;
    }
    if (!ensureRate(name)) {
      sqliteQueue.requeue(job.id, 1000);
      return;
    }
    try {
      // Batch pending text messages for same JID using indexed jid lookups
      let finalJob = job;
      try {
        const jid = job.payload && job.payload.jid;
        if (jid) {
          const others = sqliteQueue.db.prepare(`SELECT * FROM queues WHERE type = 'text' AND status = 'pending' AND jid = ?`).all(jid);
          if (others && others.length > 0) {
            const parts = [job.payload.message || ''];
            const idsToMark = [];
            for (const o of others) {
              try {
                const p = JSON.parse(o.payload || '{}');
                if (p.message) parts.push(p.message);
                idsToMark.push(o.id);
              } catch (e) {}
            }
            if (idsToMark.length) {
              const now = Date.now();
              const stmt = sqliteQueue.db.prepare(`UPDATE queues SET status = 'done', updated_at = ? WHERE id = ?`);
              idsToMark.forEach(i => stmt.run(now, i));
            }
            finalJob = { ...job, payload: { ...job.payload, message: parts.join('\n\n') } };
          }
        }
      } catch (e) { console.warn('Batching text messages failed', e.message); }

      const res = await performSend(finalJob, socket);
      sqliteQueue.markDone(job.id);
      sqliteQueue.addAck(job.id, res?.key?.id || res?.messageId || String(Date.now()), 'sent');
    } catch (err) {
      console.error('[WhatsApp Worker] text job failed:', err.message);
      const attempts = job.attempts + 1;
      const delays = [5000, 30000, 120000];
      if (attempts <= delays.length) {
        const runAt = Date.now() + delays[attempts - 1];
        sqliteQueue.db.prepare(`UPDATE queues SET attempts = ?, last_error = ?, status = 'pending', run_at = ?, updated_at = ? WHERE id = ?`).run(attempts, err.message, runAt, Date.now(), job.id);
      } else {
        sqliteQueue.markFailed(job.id, err.message);
      }
    }
  } catch (err) {
    console.error('[WhatsApp Worker] processTextQueue error:', err);
  }
};

const processMediaQueue = async () => {
  try {
    const job = sqliteQueue.fetchNext('media');
    if (!job) return;
    const name = selectSocket(job.action || 'media');
    const socket = await createSocketFor(name);
    if (!socket) {
      sqliteQueue.requeue(job.id, WAIT_FOR_CONNECTION_MS, 'WhatsApp is not connected');
      console.warn(`[WhatsApp Worker] ${job.action} job ${job.id} waiting for connected WhatsApp session`);
      return;
    }
    if (!ensureRate(name)) { sqliteQueue.requeue(job.id, 1000); return; }

    try {
      if (job.payload) {
        if (job.payload.thumbHash) {
          const thumb = mediaCacheService.getByHash(job.payload.thumbHash);
          const pdfCached = job.payload.cacheHash ? mediaCacheService.getByHash(job.payload.cacheHash) : null;
          if (thumb && thumb.provider === 'cloudinary' && thumb.provider_id) {
            const thumbUrl = getThumbnailUrl(cloudinary.url(thumb.provider_id), 'image') || cloudinary.url(thumb.provider_id);
            const pdfLink = pdfCached && pdfCached.provider === 'cloudinary' && pdfCached.provider_id ? cloudinary.url(pdfCached.provider_id) : null;
            const caption = (job.payload.caption || '') + (pdfLink ? `\n\nView full report: ${pdfLink}` : '');
            const res = await socket.sendMessage(job.payload.jid, { image: { url: thumbUrl }, caption });
            sqliteQueue.markDone(job.id);
            sqliteQueue.addAck(job.id, res?.key?.id || res?.messageId || String(Date.now()), 'sent');
            return;
          }
          if (thumb && thumb.data) {
            job.payload.thumbBuffer = thumb.data;
          }
        }

        if (job.payload.cacheHash) {
          const cached = mediaCacheService.getByHash(job.payload.cacheHash);
          if (cached && cached.data) {
            job.payload.buffer = cached.data;
          }
        }
      }
      const res = await performSend(job, socket);
      sqliteQueue.markDone(job.id);
      sqliteQueue.addAck(job.id, res?.key?.id || res?.messageId || String(Date.now()), 'sent');
    } catch (err) {
      console.error('[WhatsApp Worker] media job failed:', err.message);
      const attempts = job.attempts + 1;
      const delays = [5000, 30000, 120000];
      if (attempts <= delays.length) {
        const runAt = Date.now() + delays[attempts - 1];
        sqliteQueue.db.prepare(`UPDATE queues SET attempts = ?, last_error = ?, status = 'pending', run_at = ?, updated_at = ? WHERE id = ?`).run(attempts, err.message, runAt, Date.now(), job.id);
      } else {
        sqliteQueue.markFailed(job.id, err.message);
      }
    }
  } catch (err) {
    console.error('[WhatsApp Worker] processMediaQueue error:', err);
  }
};

const processBackgroundQueue = async () => {
  try {
    const job = sqliteQueue.fetchNext('background');
    if (!job) return;
    try {
      if (job.action === 'logActivity') {
        const { userId, userName, action, details, ip } = job.payload || {};
        const auditId = `AUD${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const timestamp = new Date().toISOString();
        await (await import('../../core/db/db.service.js')).dbService.query(
          `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, metadata, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [auditId, userId, userName, 'user', action, JSON.stringify({ details }), ip]
        );
        const { emitEvent, SOCKET_EVENTS } = await import('../../shared/sockets/socket.service.js');
        emitEvent(SOCKET_EVENTS.ACTIVITY_LOGGED, { id, userId, userName, action, details, ip, timestamp });
        emitEvent('ADMIN_AUDIT_LOG', { id: auditId, actorName: userName, action, createdAt: timestamp });
      }
      sqliteQueue.markDone(job.id);
    } catch (err) {
      console.error('[Background Worker] job failed:', err.message);
      const attempts = job.attempts + 1;
      const delays = [5000, 30000, 120000];
      if (attempts <= delays.length) {
        const runAt = Date.now() + delays[attempts - 1];
        sqliteQueue.db.prepare(`UPDATE queues SET attempts = ?, last_error = ?, status = 'pending', run_at = ?, updated_at = ? WHERE id = ?`).run(attempts, err.message, runAt, Date.now(), job.id);
      } else {
        sqliteQueue.markFailed(job.id, err.message);
      }
    }
  } catch (err) {
    console.error('[WhatsApp Worker] processBackgroundQueue error:', err);
  }
};

const recoverStaleJobs = () => {
  const now = Date.now();
  const cutoff = now - STALE_JOB_MS;

  const staleJobs = sqliteQueue.db
    .prepare(`SELECT id FROM queues WHERE status = 'in_progress' AND updated_at < ?`)
    .all(cutoff);

  for (const job of staleJobs) {
    const ack = sqliteQueue.db
      .prepare(`SELECT status FROM ack_tracking WHERE queue_id = ? AND status = 'sent' LIMIT 1`)
      .get(job.id);

    if (ack) {
      console.log(`[WhatsApp Worker] Stale job ${job.id} already marked sent in ack_tracking. Marking done.`);
      sqliteQueue.db
        .prepare(`UPDATE queues SET status = 'done', updated_at = ? WHERE id = ?`)
        .run(now, job.id);
    } else {
      console.warn(`[WhatsApp Worker] Recovering stale job ${job.id} back to pending.`);
      sqliteQueue.db
        .prepare(`UPDATE queues SET status = 'pending', run_at = ?, updated_at = ?, last_error = 'Recovered stale in-progress job' WHERE id = ?`)
        .run(now, now, job.id);
    }
  }
};

export const startWhatsAppWorker = () => {
  console.log('[WhatsApp Worker] starting queues (text + media) with default WhatsApp session');
  SOCKET_NAMES.forEach((name) => {
    if (!rateLimits.has(name)) {
      rateLimits.set(name, { tokens: 5, lastRefill: Date.now(), rate: 5 });
    }
  });
  recoverStaleJobs();
  setInterval(recoverStaleJobs, 60000);
  // Text: fast loop (200ms)
  setInterval(processTextQueue, 200);
  // Media: fast loop (200ms)
  setInterval(processMediaQueue, 200);
  // Background tasks
  setInterval(processBackgroundQueue, 500);

  // Keepalive socket ping (every 45 seconds)
  setInterval(async () => {
    try {
      const socket = getSocket();
      if (socket && socket.user) {
        console.log('[WhatsApp Worker] Sending keepalive presence ping...');
        await socket.sendPresenceUpdate('available');
      }
    } catch (e) {
      console.warn('[WhatsApp Worker] Keepalive ping failed:', e.message);
    }
  }, 45000);
};
