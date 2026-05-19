import { sqliteQueue } from '../src/shared/queue/sqliteQueue.service.js';
import { performSend } from '../src/modules/whatsapp/whatsapp.service.js';
import { mediaCacheService } from '../src/shared/services/mediaCache.service.js';

(async ()=>{
  try {
    const job = sqliteQueue.fetchNext('media');
    if (!job) { console.log('No media job'); process.exit(0); }
    console.log('Processing job id', job.id, 'action', job.action);
    console.log('Raw payload keys:', Object.keys(job.payload || {}));
    // emulate socket with a stub that throws to show behavior
    const mockSocket = {
      sendMessage: async (jid, message) => {
        console.log('Mock sendMessage called for', jid, 'message keys', Object.keys(message));
        // simulate a Baileys-like response
        return { key: { id: `MSG_${Date.now()}` }, messageId: `MSG_${Date.now()}` };
      }
    };

    // replicate worker media handling
    if (job.payload) {
      if (job.payload.thumbHash) {
        const thumb = mediaCacheService.getByHash(job.payload.thumbHash);
        const pdfCached = job.payload.cacheHash ? mediaCacheService.getByHash(job.payload.cacheHash) : null;
        if (thumb && thumb.provider === 'cloudinary' && thumb.provider_id) {
          // would send image url
          console.log('Would send cloudinary thumb URL');
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

    const res = await performSend(job, mockSocket);
    console.log('performSend result:', res);
    sqliteQueue.markDone(job.id);
    sqliteQueue.addAck(job.id, res?.key?.id || res?.messageId || String(Date.now()), 'sent');
    console.log('Job done');
  } catch (err) {
    console.error('Processing error:', err.stack || err.message || err);
  }
})();
