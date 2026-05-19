import makeWASocket from '@whiskeysockets/baileys';
import { usePostgresAuthState } from './whatsapp.auth.js';
import { getSocket } from './whatsapp.service.js';
import { sqliteQueue } from '../../shared/queue/sqliteQueue.service.js';
import { performSend } from './whatsapp.service.js';
import { mediaCacheService } from '../../shared/services/mediaCache.service.js';
import { cloudinary, getThumbnailUrl } from '../../core/config/cloudinary.js';

// Socket pool configuration
const SOCKET_NAMES = ['invoices', 'reminders', 'reports'];
const sockets = new Map();
const rateLimits = new Map();

const createSocketFor = async (name) => {
  // Prefer reusing the main service socket when available
  const mainSock = getSocket();
  if (mainSock) {
    if (!sockets.has(name)) {
      sockets.set(name, mainSock);
      // ensure rateLimits entry
      rateLimits.set(name, { tokens: 5, lastRefill: Date.now(), rate: 5 });
    }
    return mainSock;
  }

  if (sockets.has(name)) return sockets.get(name);
  // Fallback: create a lightweight socket using shared auth state (rare)
  const { state, saveCreds } = await usePostgresAuthState('default-session');
  const sock = makeWASocket({ auth: state, printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'open') console.log(`[WhatsApp ${name}] connected`);
    if (u.connection === 'close') console.log(`[WhatsApp ${name}] connection closed`);
  });

  // simple token bucket: tokens refill every second
  rateLimits.set(name, { tokens: 5, lastRefill: Date.now(), rate: 5 });

  // warm the socket periodically, but only when the socket is fully initialized
  setInterval(() => {
    try {
      const me = sock.user || (sock.auth && sock.auth.creds && sock.auth.creds.me) || (sock.authState && sock.authState.creds && sock.authState.creds.me);
      if (!me) return;
      if (typeof sock.sendPresenceUpdate === 'function') sock.sendPresenceUpdate('available');
    } catch (e) {
      console.warn('[WhatsApp Worker] presence ping failed', e && e.message);
    }
  }, 20000);

  sockets.set(name, sock);
  return sock;
};

const selectSocket = (action) => {
  // simple mapping: invoices->invoices, reminders->reminders, media->reports fallback
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
    if (!ensureRate(name)) {
      // delay requeue slightly
      sqliteQueue.requeue(job.id);
      return;
    }
    try {
      // Batch pending text messages for same JID within a short window
      let finalJob = job;
      try {
        const jid = job.payload && job.payload.jid;
        if (jid) {
          const likePattern = `%"jid":"${jid}"%`;
          const others = sqliteQueue.db.prepare(`SELECT * FROM queues WHERE type = 'text' AND status = 'pending' AND payload LIKE ?`).all(likePattern);
          if (others && others.length > 0) {
            // combine messages
            const parts = [job.payload.message || ''];
            const idsToMark = [];
            for (const o of others) {
              try {
                const p = JSON.parse(o.payload || '{}');
                if (p.message) parts.push(p.message);
                idsToMark.push(o.id);
              } catch (e) {}
            }
            // mark other pending messages done to avoid duplicates
            if (idsToMark.length) {
              const now = Date.now();
              const stmt = sqliteQueue.db.prepare(`UPDATE queues SET status = 'done', updated_at = ? WHERE id = ?`);
              idsToMark.forEach(i => stmt.run(now, i));
            }
            // create a combined job payload
            finalJob = { ...job, payload: { ...job.payload, message: parts.join('\n\n') } };
          }
        }
      } catch (e) { console.warn('Batching text messages failed', e.message); }

      const res = await performSend(finalJob, socket);
      sqliteQueue.markDone(job.id);
      sqliteQueue.addAck(job.id, res?.key?.id || res?.messageId || String(Date.now()), 'sent');
    } catch (err) {
      console.error('[WhatsApp Worker] text job failed:', err.message);
      // retry with backoff based on attempts
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
    if (!ensureRate(name)) { sqliteQueue.requeue(job.id); return; }

    try {
      // If cached, handle smart sending
        if (job.payload) {
          // If this job has a thumbnail reference (e.g., XRay), prefer sending thumbnail + link
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
              job.payload.thumbBuffer = thumb.data; // base64
            }
          }

          if (job.payload.cacheHash) {
            const cached = mediaCacheService.getByHash(job.payload.cacheHash);
            if (cached && cached.data) {
              job.payload.buffer = cached.data; // base64
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
        // perform DB writes directly here to avoid blocking callers
        const id = `LOG${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const auditId = `AUD${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const timestamp = new Date().toISOString();
        await (await import('../../core/db/db.service.js')).dbService.query(
          'INSERT INTO activity_logs (id, user_id, user_name, action, details, ip) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, userId, userName, action, details, ip]
        );
        await (await import('../../core/db/db.service.js')).dbService.query(
          `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, metadata, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [auditId, userId, userName, 'user', action, JSON.stringify({ details }), ip]
        );
        // emit events
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

export const startWhatsAppWorker = () => {
  console.log('[WhatsApp Worker] starting queues (text + media) with socket pool');
  // Start by ensuring sockets are created
  SOCKET_NAMES.forEach(n => createSocketFor(n).catch(e => console.error('socket init', n, e)));
  // Text: faster loop (~5/sec)
  setInterval(processTextQueue, 200);
  // Media: slower loop (~1/sec)
  setInterval(processMediaQueue, 1000);
  // Background tasks (async logging etc.)
  setInterval(processBackgroundQueue, 500);
};
