import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '../../../frontend/src/assets/logo.png');

export const pdfService = {
  async generatePrescriptionPDF(patient, prescription) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 50, 45, { width: 50 });
      }
      
      doc.fillColor('#0070f3').fontSize(24).text('Siara Dental Clinic', 110, 50);
      doc.fillColor('#666666').fontSize(10).text('123 Dental Street, Healthcare City', 110, 80);
      doc.text('Phone: +91 98765 43210 | Email: contact@siaradental.com', 110, 95);

      doc.moveTo(50, 115).lineTo(550, 115).strokeColor('#0070f3').lineWidth(1).stroke();

      // Title
      doc.fillColor('#000000').fontSize(20).text('PRESCRIPTION', 0, 140, { align: 'center' });

      // Patient Info
      doc.roundedRect(50, 170, 500, 50, 5).fill('#f5f7fa').stroke();
      doc.fillColor('#666666').fontSize(10).text('PATIENT DETAILS', 60, 180);
      doc.fillColor('#000000').fontSize(12).text(`Name: ${patient.name}`, 60, 195);
      doc.text(`Age/Sex: ${patient.age}Y / ${patient.gender}`, 60, 210);
      doc.text(`ID: ${patient.id}`, 400, 195);
      doc.text(`Date: ${prescription.date}`, 400, 210);

      // Rx
      doc.fillColor('#0070f3').fontSize(18).text('Rx', 50, 240);

      // Medicines
      let y = 270;
      doc.fillColor('#0070f3').fontSize(10).text('#', 50, y);
      doc.text('Medicine Name', 80, y);
      doc.text('Dosage', 250, y);
      doc.text('Frequency', 350, y);
      doc.text('Duration', 450, y);
      
      doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor('#eeeeee').stroke();
      
      y += 25;
      doc.fillColor('#000000');
      prescription.medicines.forEach((m, i) => {
        doc.text(i + 1, 50, y);
        doc.font('Helvetica-Bold').text(m.name, 80, y).font('Helvetica');
        doc.text(m.dosage, 250, y);
        doc.text(m.frequency, 350, y);
        doc.text(m.duration, 450, y);
        y += 20;
      });

      // Notes
      if (prescription.notes) {
        y += 20;
        doc.font('Helvetica-Bold').fontSize(12).text('Clinical Notes / Advice:', 50, y);
        doc.font('Helvetica').fontSize(10).fillColor('#666666').text(prescription.notes, 50, y + 15);
      }

      // Footer
      doc.moveTo(50, 700).lineTo(550, 700).strokeColor('#eeeeee').stroke();
      doc.fillColor('#999999').fontSize(10).text('Authorized Signatory', 400, 720);
      doc.text(prescription.doctorName || 'Dr. Saikiran', 400, 735);

      doc.end();
    });
  },

  async generateInvoicePDF(patient, invoice) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 50, 45, { width: 50 });
      }
      
      doc.fillColor('#0070f3').fontSize(24).text('Siara Dental Clinic', 110, 50);
      doc.fillColor('#666666').fontSize(10).text('123 Dental Street, Healthcare City', 110, 80);
      doc.text('Phone: +91 98765 43210 | Email: contact@siaradental.com', 110, 95);

      doc.moveTo(50, 115).lineTo(550, 115).strokeColor('#0070f3').lineWidth(1).stroke();

      // Invoice Info
      doc.fillColor('#000000').fontSize(20).text('INVOICE', 50, 140);
      doc.fontSize(10).text(`Invoice #: ${invoice.id}`, 400, 140);
      doc.text(`Date: ${invoice.date}`, 400, 155);
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 400, 170);

      // Billing Info
      doc.fillColor('#666666').fontSize(10).text('BILL TO', 50, 190);
      doc.fillColor('#000000').fontSize(12).text(patient.name, 50, 205);
      doc.fontSize(10).text(patient.phone, 50, 220);
      if (patient.address) {
        doc.text(patient.address, 50, 235, { width: 200 });
      }

      // Table
      let y = 280;
      doc.fillColor('#0070f3').fontSize(10).text('#', 50, y);
      doc.text('Service Description', 80, y);
      doc.text('Amount', 450, y, { align: 'right' });
      
      doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor('#0070f3').lineWidth(2).stroke();
      
      y += 25;
      doc.fillColor('#000000');
      invoice.items.forEach((item, i) => {
        doc.text(i + 1, 50, y);
        doc.text(item.description + (item.toothNumber ? ` (Tooth #${item.toothNumber})` : ""), 80, y);
        doc.text(`Rs ${item.amount.toLocaleString()}`, 450, y, { align: 'right' });
        y += 20;
      });

      // Total
      y += 20;
      doc.font('Helvetica-Bold').fontSize(14).text('Total Amount:', 300, y);
      doc.fillColor('#0070f3').text(`Rs ${invoice.total.toLocaleString()}`, 450, y, { align: 'right' });

      // Status Box
      y += 40;
      if (invoice.status === 'Paid') {
        doc.roundedRect(50, y, 500, 30, 5).fill('#e6fffa').stroke('#2c7a7b');
        doc.fillColor('#2c7a7b').fontSize(12).text('PAID IN FULL', 0, y + 10, { align: 'center' });
      } else {
        doc.roundedRect(50, y, 500, 30, 5).fill('#fff5f5').stroke('#c53030');
        doc.fillColor('#c53030').fontSize(12).text('PAYMENT PENDING', 0, y + 10, { align: 'center' });
      }

      doc.end();
    });
  }
};
