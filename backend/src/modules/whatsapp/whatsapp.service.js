import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import { usePostgresAuthState } from './whatsapp.auth.js';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pdfService } from '../../shared/services/pdf.service.js';
import { dbService } from '../../core/db/db.service.js';
import { sqliteQueue } from '../../shared/queue/sqliteQueue.service.js';
import { mediaCacheService } from '../../shared/services/mediaCache.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../../../data/whatsapp_auth');

let sock = null;
let connectionStatus = 'disconnected';
let qrCode = null;

const formatPhone = (phone) => {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `${cleaned}@s.whatsapp.net`;
  return null;
};

export const initWhatsApp = async () => {
  console.log('🔄 Initiating WhatsApp connection sequence...');
  if (connectionStatus === 'connected' || connectionStatus === 'connecting') return;
  connectionStatus = 'connecting';
  qrCode = null;

  try {
    await dbService.query('CREATE TABLE IF NOT EXISTS whatsapp_sessions (id TEXT PRIMARY KEY, data TEXT)');
    const { state, saveCreds } = await usePostgresAuthState('default-session');
    sock = makeWASocket({ auth: state, printQRInTerminal: false, browser: ['Ubuntu', 'Chrome', '20.0.04'] });
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

export const getSocket = () => sock;

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

// High-level API: enqueue sends into sqlite-backed queues
export const whatsappService = {
  async sendWelcome(patient) {
    try {
      const jid = formatPhone(patient.phone);
      if (!jid) return;
      const payload = { jid, message: `Welcome to Siara Dental Clinic, ${patient.name}! 🦷 Your registration is confirmed.` };
      sqliteQueue.enqueue('text', 'sendWelcome', payload);
    } catch (error) { console.error('enqueue sendWelcome failed:', error); }
  },

  async sendInvoice(patient, invoice) {
    try {
      const jid = formatPhone(patient.phone);
      if (!jid) return;
      const pdfBuffer = await pdfService.generateInvoicePDF(patient, invoice, { lightweight: true });
      const hash = mediaCacheService.hashBuffer(pdfBuffer);
      const cached = mediaCacheService.getByHash(hash);
      if (cached) {
        const payload = { jid, cacheHash: hash, fileName: `Invoice_${invoice.id}.pdf`, mimetype: 'application/pdf', caption: `Hello ${patient.name}, your invoice of ₹${invoice.total} (Invoice #${invoice.id}) from Siara Dental Clinic is ready.` };
        sqliteQueue.enqueue('media', 'sendInvoice', payload, { dedupKey: `invoice:${invoice.id}:${patient.id}` });
      } else {
        await mediaCacheService.storeBuffer(pdfBuffer, 'application/pdf', `Invoice_${invoice.id}.pdf`);
        const payload = { jid, buffer: pdfBuffer.toString('base64'), fileName: `Invoice_${invoice.id}.pdf`, mimetype: 'application/pdf', caption: `Hello ${patient.name}, your invoice of ₹${invoice.total} (Invoice #${invoice.id}) from Siara Dental Clinic is ready.` };
        sqliteQueue.enqueue('media', 'sendInvoice', payload, { dedupKey: `invoice:${invoice.id}:${patient.id}` });
      }
    } catch (error) { console.error('enqueue sendInvoice failed:', error); }
  },

  async sendPrescription(patient, prescription) {
    try {
      const jid = formatPhone(patient.phone);
      if (!jid) return;
      const pdfBuffer = await pdfService.generatePrescriptionPDF(patient, prescription, [], { lightweight: true });
      const hash = mediaCacheService.hashBuffer(pdfBuffer);
      const cached = mediaCacheService.getByHash(hash);
      if (cached) {
        const payload = { jid, cacheHash: hash, fileName: `Prescription_${prescription.id}.pdf`, mimetype: 'application/pdf', caption: `Hello ${patient.name}, your prescription from Siara Dental Clinic (Date: ${prescription.date}) is ready.` };
        sqliteQueue.enqueue('media', 'sendPrescription', payload, { dedupKey: `presc:${prescription.id}:${patient.id}` });
      } else {
        await mediaCacheService.storeBuffer(pdfBuffer, 'application/pdf', `Prescription_${prescription.id}.pdf`);
        const payload = { jid, buffer: pdfBuffer.toString('base64'), fileName: `Prescription_${prescription.id}.pdf`, mimetype: 'application/pdf', caption: `Hello ${patient.name}, your prescription from Siara Dental Clinic (Date: ${prescription.date}) is ready.` };
        sqliteQueue.enqueue('media', 'sendPrescription', payload, { dedupKey: `presc:${prescription.id}:${patient.id}` });
      }
    } catch (error) { console.error('enqueue sendPrescription failed:', error); }
  },

  async sendXrayReport(patient, xray) {
    try {
      const jid = formatPhone(patient.phone);
      if (!jid) return;
      const pdfBuffer = await pdfService.generateXRayReportPDF(patient, xray, { lightweight: true });
      const hash = mediaCacheService.hashBuffer(pdfBuffer);
      const cached = mediaCacheService.getByHash(hash);

      // Prepare thumbnail from original xray image if available
      let thumbHash = null;
      if (xray.fileUrl) {
        try {
          const res = await fetch(xray.fileUrl);
          if (res.ok) {
            const arr = await res.arrayBuffer();
            const buf = Buffer.from(arr);
            const thumbBuf = await mediaCacheService.generateThumbnail(buf, { width: 600 });
            if (thumbBuf) {
              const thumbRes = await mediaCacheService.storeBuffer(thumbBuf, 'image/webp', `xray_thumb_${xray.id}.webp`);
              thumbHash = thumbRes.hash;
            }
          }
        } catch (e) {
          console.warn('sendXrayReport: thumbnail generation failed', e.message);
        }
      }

      if (cached) {
        const payload = { jid, cacheHash: hash, thumbHash, fileName: `XRay_Report_${xray.id}.pdf`, mimetype: 'application/pdf', caption: `Hello ${patient.name}, your diagnostic X-Ray report from Siara Dental Clinic (${xray.type}) is ready.` };
        sqliteQueue.enqueue('media', 'sendXrayReport', payload, { dedupKey: `xray:${xray.id}:${patient.id}` });
      } else {
        await mediaCacheService.storeBuffer(pdfBuffer, 'application/pdf', `XRay_Report_${xray.id}.pdf`);
        const payload = { jid, buffer: pdfBuffer.toString('base64'), thumbHash, fileName: `XRay_Report_${xray.id}.pdf`, mimetype: 'application/pdf', caption: `Hello ${patient.name}, your diagnostic X-Ray report from Siara Dental Clinic (${xray.type}) is ready.` };
        sqliteQueue.enqueue('media', 'sendXrayReport', payload, { dedupKey: `xray:${xray.id}:${patient.id}` });
      }
    } catch (error) { console.error('enqueue sendXrayReport failed:', error); }
  },

  async sendReminder(appt) {
    try {
      const jid = formatPhone(appt.phone);
      if (!jid) return;
      const payload = { jid, message: `⏰ Reminder: Hello ${appt.name}, your ${appt.type || 'dental'} appointment at Siara Dental Clinic is tomorrow at ${appt.time}. Please arrive 5 minutes early.` };
      sqliteQueue.enqueue('text', 'sendReminder', payload);
    } catch (error) { console.error('enqueue sendReminder failed:', error); }
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
      // If there's a thumbnail buffer, send that as image first
      if (payload.thumbBuffer) {
        const imgBuf = Buffer.from(payload.thumbBuffer, 'base64');
        await socket.sendMessage(payload.jid, { image: imgBuf, caption: payload.caption || '' });
        // Do not send full document immediately to avoid blocking; caller may decide
      }
      if (payload.buffer) {
        const buffer = Buffer.from(payload.buffer, 'base64');
        return await socket.sendMessage(payload.jid, { document: buffer, fileName: payload.fileName, mimetype: payload.mimetype, caption: payload.caption });
      }
      // If no buffer present, assume cached provider will be used by worker
      return { ok: true };
    }
    default:
      throw new Error(`Unknown action ${action}`);
  }
};
