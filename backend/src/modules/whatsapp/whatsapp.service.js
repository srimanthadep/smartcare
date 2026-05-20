import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import { hasPostgresAuthState, usePostgresAuthState } from './whatsapp.auth.js';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pdfService } from '../../shared/services/pdf.service.js';
import { dbService } from '../../core/db/db.service.js';
import { sqliteQueue } from '../../shared/queue/sqliteQueue.service.js';
import { mediaCacheService } from '../../shared/services/mediaCache.service.js';
import { cloudinary, getThumbnailUrl } from '../../core/config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../../../data/whatsapp_auth');

let sock = null;
let connectionStatus = 'disconnected';
let qrCode = null;

export const formatPhone = (phone) => {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = '91' + cleaned.slice(1);
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `${cleaned}@s.whatsapp.net`;
  return null;
};

const resolveJid = (phone, action, recipientName) => {
  const jid = formatPhone(phone);
  if (!jid) {
    console.warn(`[WhatsApp] ${action} skipped: invalid or missing phone for ${recipientName || 'unknown recipient'} (${phone || 'empty'})`);
  }
  return jid;
};

export const initWhatsApp = async () => {
  console.log('🔄 Initiating WhatsApp connection sequence...');
  if (connectionStatus === 'connected' || connectionStatus === 'connecting') return;
  connectionStatus = 'connecting';
  qrCode = null;

  try {
    await dbService.query('CREATE TABLE IF NOT EXISTS whatsapp_sessions (id TEXT PRIMARY KEY, data TEXT)');
    const { state, saveCreds } = await usePostgresAuthState('default-session');
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      getMessage: async (key) => {
        return { conversation: '' };
      }
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        console.log('📱 QR Received');
        connectionStatus = 'awaiting_qr';
        try { qrCode = await QRCode.toDataURL(qr); } catch (qrErr) { console.error('QR Generate Error', qrErr); }
      }
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        if (!shouldReconnect) {
          await disconnectWhatsApp();
        } else {
          connectionStatus = 'disconnected';
          qrCode = null;
          setTimeout(() => initWhatsApp(), 5000);
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        qrCode = null;
        console.log('✅ WhatsApp connected');
      }
    });
  } catch (error) {
    console.error('❌ WhatsApp Init Failed:', error.message);
    connectionStatus = 'disconnected';
  }
};

export const disconnectWhatsApp = async () => {
  try { if (sock) { await sock.logout(); sock = null; } } catch (err) {}
  connectionStatus = 'disconnected'; qrCode = null;
  try {
    await dbService.query("DELETE FROM whatsapp_sessions WHERE id LIKE 'default-session-%' OR id = 'default-session'");
    console.log('🗑️ WhatsApp session cleared from database');
  } catch (err) { console.error('Failed to clear whatsapp session from DB:', err); }
  if (fs.existsSync(AUTH_PATH)) fs.rmSync(AUTH_PATH, { recursive: true, force: true });
};

export const getStatus = () => ({ status: connectionStatus, qr: qrCode });
export const getSocket = () => sock;
export const isWhatsAppReady = () => connectionStatus === 'connected' && Boolean(sock);

export const getWhatsAppReadiness = async () => {
  const hasSavedSession = await hasPostgresAuthState('default-session');
  return {
    status: connectionStatus,
    connected: isWhatsAppReady(),
    hasSavedSession,
  };
};

export const ensureWhatsAppReadyForQueue = async () => {
  const readiness = await getWhatsAppReadiness();
  if (!readiness.connected && readiness.hasSavedSession && connectionStatus === 'disconnected') {
    initWhatsApp().catch((err) => console.error('[WhatsApp] reconnect failed:', err.message));
  }
  return {
    ...readiness,
    canQueue: readiness.connected || readiness.hasSavedSession,
  };
};

// High-level API: enqueue sends into sqlite-backed queues
export const whatsappService = {
  async sendWelcome(patient) {
    try {
      const jid = resolveJid(patient.phone, 'sendWelcome', patient.name);
      if (!jid) return { queued: false, error: 'Invalid or missing phone' };
      
      const message = `Welcome to *SIARA Dental Clinic*, *${patient.name}*! 🦷 Your registration is successfully confirmed.

We are dedicated to providing you with advanced, painless, and premium dental care.

✨ *Our Specialities:*
• Painless Root Canals (RCT)
• Advanced Dental Implants
• Modern Aligners & Braces
• Aesthetic Smile Designing & Whitening

📍 *Location:* Kothapet Main Road, Kothapet, Hyderabad
📞 *Contact:* +91 8919878543
🕒 *Timings:* Mon - Sat | 10:00 AM - 8:00 PM (Closed on Sundays)
🌐 *Website:* https://siaradental.in

We look forward to giving you a healthy, beautiful smile! See you soon! 😊`;

      // 1. Try immediate send if WhatsApp is connected
      if (isWhatsAppReady()) {
        try {
          console.log(`[WhatsApp] Attempting immediate send of welcome message to ${jid}`);
          const res = await sock.sendMessage(jid, { text: message });
          console.log(`[WhatsApp] Immediate welcome message sent successfully to ${jid}`);
          return { queued: true, sent: true, messageId: res?.key?.id || String(Date.now()) };
        } catch (sendErr) {
          console.warn(`[WhatsApp] Immediate welcome send failed. Falling back to queue. Error:`, sendErr.message);
        }
      }

      // 2. Fallback to sqlite queue
      const payload = { jid, message };
      const queueId = sqliteQueue.enqueue('text', 'sendWelcome', payload);
      console.log(`[WhatsApp] Queued welcome message ${queueId} for ${jid} (fallback retry)`);
      return { queued: true, queueId };
    } catch (error) {
      console.error('sendWelcome failed:', error);
      return { queued: false, error: error.message };
    }
  },

  async sendInvoice(patient, invoice) {
    try {
      const jid = resolveJid(patient.phone, 'sendInvoice', patient.name);
      if (!jid) return { queued: false, error: 'Invalid or missing phone' };
      
      const caption = `Hello *${patient.name}*, your invoice of ₹${invoice.total} (Invoice #${invoice.id}) from SIARA Dental Clinic is ready.\n\n🌐 Visit us: https://siaradental.in`;

      // 1. Try immediate send if WhatsApp is connected
      if (isWhatsAppReady()) {
        try {
          console.log(`[WhatsApp] Generating PDF and attempting immediate invoice send to ${jid}`);
          const pdfBuffer = await pdfService.generateInvoicePDF(patient, invoice);
          
          // Store in mediaCache asynchronously
          mediaCacheService.storeBuffer(pdfBuffer, 'application/pdf', `Invoice_${invoice.id}.pdf`).catch((e) => {
            console.warn('[WhatsApp] Failed to asynchronously cache invoice PDF:', e.message);
          });

          const res = await sock.sendMessage(jid, {
            document: pdfBuffer,
            fileName: `Invoice_${invoice.id}.pdf`,
            mimetype: 'application/pdf',
            caption: caption
          });
          console.log(`[WhatsApp] Immediate invoice sent successfully to ${jid}`);
          return { queued: true, sent: true, messageId: res?.key?.id || String(Date.now()) };
        } catch (sendErr) {
          console.warn(`[WhatsApp] Immediate invoice send failed. Falling back to queue. Error:`, sendErr.message);
        }
      }

      // 2. Fallback: Queue
      const payload = {
        jid,
        patientId: patient.id,
        invoiceId: invoice.id,
        fileName: `Invoice_${invoice.id}.pdf`,
        mimetype: 'application/pdf',
        caption: caption
      };
      const queueId = sqliteQueue.enqueue('media', 'sendInvoice', payload, { dedupKey: `invoice:${invoice.id}:${patient.id}` });
      console.log(`[WhatsApp] Queued lightweight invoice job ${invoice.id} as media job ${queueId} for ${jid} (fallback retry)`);
      return { queued: true, queueId };
    } catch (error) {
      console.error('sendInvoice failed:', error);
      return { queued: false, error: error.message };
    }
  },

  async sendPrescription(patient, prescription) {
    try {
      const jid = resolveJid(patient.phone, 'sendPrescription', patient.name);
      if (!jid) return { queued: false, error: 'Invalid or missing WhatsApp phone number' };
      
      const caption = `Hello *${patient.name}*, your prescription from SIARA Dental Clinic (Date: ${prescription.date}) is ready. Please follow the instructions carefully.\n\n🌐 Visit us: https://siaradental.in`;

      // 1. Try immediate send if WhatsApp is connected
      if (isWhatsAppReady()) {
        try {
          console.log(`[WhatsApp] Fetching X-rays and generating PDF for immediate prescription send to ${jid}`);
          let xrays = [];
          if (prescription.xrayIds && prescription.xrayIds.length > 0) {
            const xrayRes = await dbService.query('SELECT * FROM xrays WHERE id = ANY($1)', [prescription.xrayIds]);
            xrays = dbService.mapRows('xrays', xrayRes.rows);
          }
          const pdfBuffer = await pdfService.generatePrescriptionPDF(patient, prescription, xrays);

          // Store in mediaCache asynchronously
          mediaCacheService.storeBuffer(pdfBuffer, 'application/pdf', `Prescription_${prescription.id}.pdf`).catch((e) => {
            console.warn('[WhatsApp] Failed to asynchronously cache prescription PDF:', e.message);
          });

          const res = await sock.sendMessage(jid, {
            document: pdfBuffer,
            fileName: `Prescription_${prescription.id}.pdf`,
            mimetype: 'application/pdf',
            caption: caption
          });
          console.log(`[WhatsApp] Immediate prescription sent successfully to ${jid}`);
          return { queued: true, sent: true, messageId: res?.key?.id || String(Date.now()) };
        } catch (sendErr) {
          console.warn(`[WhatsApp] Immediate prescription send failed. Falling back to queue. Error:`, sendErr.message);
        }
      }

      // 2. Fallback: Queue
      const payload = {
        jid,
        patientId: patient.id,
        prescriptionId: prescription.id,
        fileName: `Prescription_${prescription.id}.pdf`,
        mimetype: 'application/pdf',
        caption: caption
      };
      const queueId = sqliteQueue.enqueue('media', 'sendPrescription', payload, { dedupKey: `presc:${prescription.id}:${patient.id}` });
      console.log(`[WhatsApp] Queued lightweight prescription job ${prescription.id} as media job ${queueId} for ${jid} (fallback retry)`);
      return { queued: true, queueId };
    } catch (error) {
      console.error('sendPrescription failed:', error);
      return { queued: false, error: error.message };
    }
  },

  async sendXrayReport(patient, xray) {
    try {
      const jid = resolveJid(patient.phone, 'sendXrayReport', patient.name);
      if (!jid) return { queued: false, error: 'Invalid or missing WhatsApp phone number' };
      
      const caption = `Hello *${patient.name}*, your diagnostic X-Ray report from SIARA Dental Clinic (${xray.type}) is ready.\n\n🌐 Visit us: https://siaradental.in`;

      // 1. Try immediate send if WhatsApp is connected
      if (isWhatsAppReady()) {
        try {
          console.log(`[WhatsApp] Generating PDF and attempting immediate X-ray report send to ${jid}`);
          const pdfBuffer = await pdfService.generateXRayReportPDF(patient, xray);

          // Store in mediaCache asynchronously
          mediaCacheService.storeBuffer(pdfBuffer, 'application/pdf', `XRay_Report_${xray.id}.pdf`).catch((e) => {
            console.warn('[WhatsApp] Failed to asynchronously cache X-ray PDF:', e.message);
          });

          const res = await sock.sendMessage(jid, {
            document: pdfBuffer,
            fileName: `XRay_Report_${xray.id}.pdf`,
            mimetype: 'application/pdf',
            caption: caption
          });
          console.log(`[WhatsApp] Immediate X-ray report sent successfully to ${jid}`);
          return { queued: true, sent: true, messageId: res?.key?.id || String(Date.now()) };
        } catch (sendErr) {
          console.warn(`[WhatsApp] Immediate X-ray report send failed. Falling back to queue. Error:`, sendErr.message);
        }
      }

      // 2. Fallback: Queue
      const payload = {
        jid,
        patientId: patient.id,
        xrayId: xray.id,
        fileName: `XRay_Report_${xray.id}.pdf`,
        mimetype: 'application/pdf',
        caption: caption
      };
      const queueId = sqliteQueue.enqueue('media', 'sendXrayReport', payload, { dedupKey: `xray:${xray.id}:${patient.id}` });
      console.log(`[WhatsApp] Queued lightweight X-ray report job ${xray.id} as media job ${queueId} for ${jid} (fallback retry)`);
      return { queued: true, queueId };
    } catch (error) {
      console.error('sendXrayReport failed:', error);
      return { queued: false, error: error.message };
    }
  },

  async sendReminder(appt) {
    try {
      const jid = resolveJid(appt.phone, 'sendReminder', appt.name);
      if (!jid) return { queued: false, error: 'Invalid or missing phone' };
      
      const message = `⏰ *Appointment Reminder*

Hello *${appt.name}*, this is a friendly reminder for your *${appt.type || 'dental'}* appointment at SIARA Dental Clinic tomorrow at *${appt.time}*.

📍 *Location:* Kothapet Main Road, Kothapet, Hyderabad
📞 *Contact:* +91 8919878543
🌐 *Website:* https://siaradental.in

Please arrive 5 minutes prior to your scheduled time. We look forward to seeing you!`;

      const payload = { jid, message };
      const queueId = sqliteQueue.enqueue('text', 'sendReminder', payload);
      console.log(`[WhatsApp] Queued reminder ${queueId} for ${jid}`);
      return { queued: true, queueId };
    } catch (error) {
      console.error('enqueue sendReminder failed:', error);
      return { queued: false, error: error.message };
    }
  }
};

// Low-level performer used by the worker — accepts a job row retrieved from sqliteQueue
export const performSend = async (job, socket) => {
  const { action, payload } = job;
  if (!socket) throw new Error('No socket available');

  switch (action) {
    case 'sendWelcome':
    case 'sendReminder':
      return await socket.sendMessage(payload.jid, { text: payload.message });

    case 'sendInvoice':
    case 'sendPrescription':
    case 'sendXrayReport': {
      let buffer = null;
      let thumbBuffer = null;
      let thumbHash = payload.thumbHash;
      let cacheHash = payload.cacheHash;

      // 1. Resolve raw buffer from payload
      if (payload.buffer) {
        buffer = Buffer.from(payload.buffer, 'base64');
      }
      if (payload.thumbBuffer) {
        thumbBuffer = Buffer.from(payload.thumbBuffer, 'base64');
      }

      // 2. Resolve cache hashes if buffer missing
      if (!buffer && cacheHash) {
        const cached = mediaCacheService.getByHash(cacheHash);
        if (cached && cached.data) {
          buffer = Buffer.from(cached.data, 'base64');
        }
      }
      if (!thumbBuffer && thumbHash) {
        const thumbCached = mediaCacheService.getByHash(thumbHash);
        if (thumbCached && thumbCached.data) {
          thumbBuffer = Buffer.from(thumbCached.data, 'base64');
        }
      }

      // 3. Lazy PDF/Thumbnail Generation inside Worker (if buffer is still missing)
      if (!buffer) {
        console.log(`[WhatsApp Worker] Lazy-generating PDF for ${action} (job ${job.id})...`);
        if (action === 'sendInvoice') {
          const { invoiceId } = payload;
          const resInv = await dbService.query(`
            SELECT i.*, p.name as patient_name, p.phone as patient_phone, p.age, p.gender, p.email as patient_email
            FROM invoices i
            JOIN patients p ON i.patient_id = p.id
            WHERE i.id = $1
          `, [invoiceId]);
          const invoice = dbService.mapRows('invoices', resInv.rows)[0];
          if (!invoice) throw new Error(`Invoice ${invoiceId} not found for lazy PDF generation`);
          const patient = {
            id: invoice.patientId,
            name: invoice.patientName,
            phone: invoice.patientPhone,
            age: invoice.age,
            gender: invoice.gender,
            email: invoice.patientEmail
          };
          
          const pdfBuffer = await pdfService.generateInvoicePDF(patient, invoice);
          const storeRes = await mediaCacheService.storeBuffer(pdfBuffer, 'application/pdf', `Invoice_${invoiceId}.pdf`);
          buffer = pdfBuffer;
          cacheHash = storeRes.hash;
        } else if (action === 'sendPrescription') {
          const { prescriptionId } = payload;
          const pxRes = await dbService.query(`
            SELECT pr.*, p.name as patient_name, p.phone as patient_phone, p.age, p.gender, p.email as patient_email
            FROM prescriptions pr
            JOIN patients p ON pr.patient_id = p.id
            WHERE pr.id = $1
          `, [prescriptionId]);
          const prescription = dbService.mapRows('prescriptions', pxRes.rows)[0];
          if (!prescription) throw new Error(`Prescription ${prescriptionId} not found for lazy PDF generation`);
          const patient = {
            id: prescription.patientId,
            name: prescription.patientName,
            phone: prescription.phone || prescription.patientPhone,
            age: prescription.age,
            gender: prescription.gender,
            email: prescription.patientEmail
          };
          let xrays = [];
          if (prescription.xrayIds && prescription.xrayIds.length > 0) {
            const xrayRes = await dbService.query('SELECT * FROM xrays WHERE id = ANY($1)', [prescription.xrayIds]);
            xrays = dbService.mapRows('xrays', xrayRes.rows);
          }
          const pdfBuffer = await pdfService.generatePrescriptionPDF(patient, prescription, xrays);
          const storeRes = await mediaCacheService.storeBuffer(pdfBuffer, 'application/pdf', `Prescription_${prescriptionId}.pdf`);
          buffer = pdfBuffer;
          cacheHash = storeRes.hash;
        } else if (action === 'sendXrayReport') {
          const { xrayId } = payload;
          const result = await dbService.query(
            `SELECT x.*, p.name as patient_name, p.age as patient_age, p.gender as patient_gender, p.phone as patient_phone, p.email as patient_email
             FROM xrays x LEFT JOIN patients p ON x.patient_id = p.id
             WHERE x.id = $1 AND x.is_deleted = FALSE`,
            [xrayId]
          );
          const xray = dbService.mapRows('xrays', result.rows)[0];
          if (!xray) throw new Error(`Xray ${xrayId} not found for lazy PDF generation`);
          const patient = {
            id: xray.patientId,
            name: xray.patientName,
            phone: xray.patientPhone,
            age: xray.patientAge,
            gender: xray.patientGender,
            email: xray.patientEmail
          };
          const pdfBuffer = await pdfService.generateXRayReportPDF(patient, xray);
          const storeRes = await mediaCacheService.storeBuffer(pdfBuffer, 'application/pdf', `XRay_Report_${xrayId}.pdf`);
          buffer = pdfBuffer;
          cacheHash = storeRes.hash;

          // Lazy generate thumbnail inside worker
          if (xray.fileUrl && !thumbBuffer && !thumbHash) {
            try {
              console.log(`[WhatsApp Worker] Lazy-generating thumbnail for xray ${xrayId}...`);
              const res = await fetch(xray.fileUrl);
              if (res.ok) {
                const arr = await res.arrayBuffer();
                const buf = Buffer.from(arr);
                const thumbBuf = await mediaCacheService.generateThumbnail(buf, { width: 600 });
                if (thumbBuf) {
                  const thumbRes = await mediaCacheService.storeBuffer(thumbBuf, 'image/webp', `xray_thumb_${xrayId}.webp`);
                  thumbHash = thumbRes.hash;
                  thumbBuffer = thumbBuf;
                }
              }
            } catch (e) {
              console.warn('[WhatsApp Worker] Lazy thumbnail generation failed:', e.message);
            }
          }
        }
      }

      // 4. Send using fallback smart modes (Cloudinary templates) or full buffer attachments
      if (thumbHash) {
        const thumb = mediaCacheService.getByHash(thumbHash);
        const pdfCached = cacheHash ? mediaCacheService.getByHash(cacheHash) : null;
        if (thumb && thumb.provider === 'cloudinary' && thumb.provider_id) {
          const thumbUrl = getThumbnailUrl(cloudinary.url(thumb.provider_id), 'image') || cloudinary.url(thumb.provider_id);
          const pdfLink = pdfCached && pdfCached.provider === 'cloudinary' && pdfCached.provider_id ? cloudinary.url(pdfCached.provider_id) : null;
          const caption = (payload.caption || '') + (pdfLink ? `\n\nView full report: ${pdfLink}` : '');
          return await socket.sendMessage(payload.jid, { image: { url: thumbUrl }, caption });
        }
      }

      if (thumbBuffer) {
        await socket.sendMessage(payload.jid, { image: thumbBuffer, caption: payload.caption || '' });
      }

      if (buffer) {
        return await socket.sendMessage(payload.jid, { document: buffer, fileName: payload.fileName, mimetype: payload.mimetype, caption: payload.caption });
      }
      throw new Error(`Missing media buffer for ${action}`);
    }
    default:
      throw new Error(`Unknown action ${action}`);
  }
};
