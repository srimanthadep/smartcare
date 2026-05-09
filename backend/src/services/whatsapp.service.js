import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pdfService } from './pdf.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../../data/whatsapp_auth');

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
  
  if (connectionStatus === "connected") return;

  connectionStatus = "connecting";
  qrCode = null;

  try {
    if (!fs.existsSync(path.dirname(AUTH_PATH))) {
      fs.mkdirSync(path.dirname(AUTH_PATH), { recursive: true });
    }

    // Verify imports
    if (typeof useMultiFileAuthState !== 'function') {
      throw new Error(`useMultiFileAuthState is not a function (got ${typeof useMultiFileAuthState})`);
    }
    if (typeof makeWASocket !== 'function') {
      throw new Error(`makeWASocket is not a function (got ${typeof makeWASocket})`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
    console.log('📦 Auth state loaded');

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['SmartDental', 'Chrome', '1.0.0'],
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
    if (connectionStatus !== "connected" || !sock) {
      throw new Error('WhatsApp service is disconnected');
    }
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
    if (connectionStatus !== "connected" || !sock) {
      throw new Error('WhatsApp service is disconnected');
    }
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
    if (connectionStatus !== "connected" || !sock) {
      throw new Error('WhatsApp service is disconnected');
    }
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
  }
};
