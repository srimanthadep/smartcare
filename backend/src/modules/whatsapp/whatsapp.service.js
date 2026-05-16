import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import { usePostgresAuthState } from './whatsapp.auth.js';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pdfService } from '../../shared/services/pdf.service.js';
import { dbService } from '../../core/db/db.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../../../data/whatsapp_auth');

let sock = null;
let connectionStatus = "disconnected";
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
  
  if (connectionStatus === "connected" || connectionStatus === "connecting") return;

  connectionStatus = "connecting";
  qrCode = null;

  try {
    // Ensure table exists
    await dbService.query('CREATE TABLE IF NOT EXISTS whatsapp_sessions (id TEXT PRIMARY KEY, data TEXT)');

    const { state, saveCreds } = await usePostgresAuthState('default-session');
    console.log('📦 Database auth state loaded');

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
    });

    console.log('🔌 Socket created');

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('📱 QR Received');
        connectionStatus = "awaiting_qr";
        try {
          qrCode = await QRCode.toDataURL(qr);
        } catch (qrErr) {
          console.error('QR Generate Error', qrErr);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        if (!shouldReconnect) {
          await disconnectWhatsApp();
        } else {
          connectionStatus = "disconnected";
          qrCode = null;
          setTimeout(() => initWhatsApp(), 5000);
        }
      } else if (connection === 'open') {
        connectionStatus = "connected";
        qrCode = null;
        console.log('✅ WhatsApp connected');
      }
    });
  } catch (error) {
    console.error('❌ WhatsApp Init Failed:', error.message);
    connectionStatus = "disconnected";
  }
};

export const disconnectWhatsApp = async () => {
  try {
    if (sock) {
      await sock.logout();
      sock = null;
    }
  } catch (err) {}
  
  connectionStatus = "disconnected";
  qrCode = null;

  // Clear database session
  try {
    await dbService.query("DELETE FROM whatsapp_sessions WHERE id LIKE 'default-session-%' OR id = 'default-session'");
    console.log('🗑️ WhatsApp session cleared from database');
  } catch (err) {
    console.error('Failed to clear whatsapp session from DB:', err);
  }

  if (fs.existsSync(AUTH_PATH)) {
    fs.rmSync(AUTH_PATH, { recursive: true, force: true });
  }
};

export const getStatus = () => ({
  status: connectionStatus,
  qr: qrCode
});

export const whatsappService = {
  async sendWelcome(patient) {
    // Silent skip — WhatsApp is optional, not a critical path
    if (connectionStatus !== "connected" || !sock) return;
    try {
      const jid = formatPhone(patient.phone);
      if (!jid) return;
      const message = `Welcome to Siara Dental Clinic, ${patient.name}! 🦷 Your registration is confirmed. We look forward to seeing you soon.`;
      await sock.sendMessage(jid, { text: message });
    } catch (error) {
      console.error('WhatsApp sendWelcome failed:', error);
    }
  },

  async sendInvoice(patient, invoice) {
    // Silent skip — WhatsApp is optional, not a critical path
    if (connectionStatus !== "connected" || !sock) return;
    try {
      const jid = formatPhone(patient.phone);
      if (!jid) return;
      const pdfBuffer = await pdfService.generateInvoicePDF(patient, invoice);
      const message = `Hello ${patient.name}, your invoice of ₹${invoice.total} (Invoice #${invoice.id}) from Siara Dental Clinic is ready.`;
      await sock.sendMessage(jid, { 
        document: pdfBuffer, 
        fileName: `Invoice_${invoice.id}.pdf`,
        mimetype: 'application/pdf',
        caption: message 
      });
    } catch (error) {
      console.error('WhatsApp sendInvoice failed:', error);
    }
  },

  async sendPrescription(patient, prescription) {
    // Silent skip — WhatsApp is optional, not a critical path
    if (connectionStatus !== "connected" || !sock) return;
    try {
      const jid = formatPhone(patient.phone);
      if (!jid) return;
      const pdfBuffer = await pdfService.generatePrescriptionPDF(patient, prescription);
      const message = `Hello ${patient.name}, your prescription from Siara Dental Clinic (Date: ${prescription.date}) is ready.`;
      await sock.sendMessage(jid, { 
        document: pdfBuffer, 
        fileName: `Prescription_${prescription.id}.pdf`,
        mimetype: 'application/pdf',
        caption: message 
      });
    } catch (error) {
      console.error('WhatsApp sendPrescription failed:', error);
    }
  },

  async sendXrayReport(patient, xray) {
    if (connectionStatus !== "connected" || !sock) return;
    try {
      const jid = formatPhone(patient.phone);
      if (!jid) return;
      const pdfBuffer = await pdfService.generateXRayReportPDF(patient, xray);
      const message = `Hello ${patient.name}, your diagnostic X-Ray report from Siara Dental Clinic (${xray.type}) is ready.`;
      await sock.sendMessage(jid, { 
        document: pdfBuffer, 
        fileName: `XRay_Report_${xray.id}.pdf`,
        mimetype: 'application/pdf',
        caption: message 
      });
    } catch (error) {
      console.error('WhatsApp sendXrayReport failed:', error);
    }
  },

  async sendReminder(appt) {
    // Silent skip — WhatsApp is optional, not a critical path
    if (connectionStatus !== "connected" || !sock) return;
    try {
      const jid = formatPhone(appt.phone);
      if (!jid) return;
      const message = `⏰ Reminder: Hello ${appt.name}, your ${appt.type || 'dental'} appointment at Siara Dental Clinic is *tomorrow* at *${appt.time}*.\n\nPlease arrive 5 minutes early. See you soon! 🦷`;
      await sock.sendMessage(jid, { text: message });
    } catch (error) {
      console.error('WhatsApp sendReminder failed:', error);
    }
  }
};
