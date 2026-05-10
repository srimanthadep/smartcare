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
        doc.image(LOGO_PATH, 50, 40, { width: 45 });
      }
      
      doc.fillColor('#1d0d08').fontSize(22).font('Helvetica-Bold').text('SIARA DENTAL', 110, 45);
      doc.fillColor('#ff7a1a').fontSize(8).text('CREATING MILES OF SMILES', 110, 68, { characterSpacing: 1.5 });
      doc.fillColor('#666666').fontSize(8).font('Helvetica').text('Omini Hospital Road, opp. Nayara Petrol bunk, Hyderabad', 110, 85);
      doc.text('Ph: +91 89198 78543 | Web: www.siaradental.in', 110, 95);

      doc.moveTo(50, 115).lineTo(550, 115).strokeColor('#ff7a1a').lineWidth(1.5).stroke();

      // Title
      doc.fillColor('#1d0d08').fontSize(18).font('Helvetica-Bold').text('PRESCRIPTION', 0, 135, { align: 'center' });

      // Patient Info
      doc.roundedRect(50, 160, 500, 55, 8).fill('#fff3ea').strokeColor('#ffb27a').lineWidth(0.5).stroke();
      doc.fillColor('#ff7a1a').fontSize(8).font('Helvetica-Bold').text('PATIENT DETAILS', 65, 170);
      doc.fillColor('#1d0d08').fontSize(11).font('Helvetica-Bold').text(`Name: ${patient.name}`, 65, 185);
      doc.fontSize(9).font('Helvetica').text(`Age/Gender: ${patient.age}Y / ${patient.gender}`, 65, 200);
      doc.fontSize(9).text(`Prescription ID: ${prescription.id}`, 380, 185);
      doc.fontSize(9).text(`Date: ${prescription.date}`, 380, 200);

      let y = 230;

      // Chief Complaint & Diagnosis
      if (prescription.chiefComplaint) {
        doc.fillColor('#ff7a1a').fontSize(9).font('Helvetica-Bold').text('1. CHIEF COMPLAINT', 50, y);
        doc.fillColor('#444444').fontSize(10).font('Helvetica').text(prescription.chiefComplaint, 60, y + 15);
        y += 45;
      }

      if (prescription.diagnosis) {
        doc.fillColor('#ff7a1a').fontSize(9).font('Helvetica-Bold').text('2. DIAGNOSIS', 50, y);
        doc.fillColor('#444444').fontSize(10).font('Helvetica').text(prescription.diagnosis, 60, y + 15);
        y += 45;
      }

      // Treatment Plan
      if (prescription.treatmentPlan && prescription.treatmentPlan.length > 0) {
        doc.fillColor('#ff7a1a').fontSize(9).font('Helvetica-Bold').text('3. TREATMENT PLAN', 50, y);
        y += 18;
        
        doc.fillColor('#1d0d08').fontSize(8).font('Helvetica-Bold').text('Phase / Procedure', 60, y);
        doc.text('Estimated Cost', 450, y, { align: 'right' });
        
        doc.moveTo(50, y + 10).lineTo(550, y + 10).strokeColor('#ffb27a').lineWidth(0.5).stroke();
        y += 18;

        prescription.treatmentPlan.forEach((p) => {
          doc.fillColor('#444444').fontSize(9).font('Helvetica').text(p.name, 60, y);
          doc.fillColor('#1d0d08').font('Helvetica-Bold').text(`Rs.${p.estimatedCost?.toLocaleString()}`, 450, y, { align: 'right' });
          y += 15;
          if (p.description) {
            doc.fillColor('#888888').fontSize(8).font('Helvetica').text(p.description, 65, y);
            y += 12;
          }
          y += 5;
        });
        y += 10;
      }

      // Rx
      doc.fillColor('#ff7a1a').fontSize(14).font('Helvetica-Bold').text('Rx', 50, y);
      y += 20;

      // Medicines Table Header
      doc.roundedRect(50, y, 500, 20, 4).fill('#fff3ea');
      doc.fillColor('#ff7a1a').fontSize(8).font('Helvetica-Bold').text('Medicine Name', 60, y + 7);
      doc.text('Dosage', 250, y + 7);
      doc.text('Frequency', 350, y + 7);
      doc.text('Duration', 450, y + 7);
      
      y += 28;
      doc.fillColor('#000000').font('Helvetica');
      prescription.medicines.forEach((m, i) => {
        if (y > 700) { doc.addPage(); y = 50; }
        doc.fontSize(9).font('Helvetica-Bold').text(m.name, 60, y).font('Helvetica');
        doc.text(m.dosage, 250, y);
        doc.text(m.frequency, 350, y);
        doc.text(m.duration, 450, y);
        y += 18;
        doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#eeeeee').lineWidth(0.5).stroke();
      });

      // Notes
      if (prescription.notes) {
        y += 15;
        if (y > 700) { doc.addPage(); y = 50; }
        doc.fillColor('#ff7a1a').fontSize(9).font('Helvetica-Bold').text('CLINICAL ADVICE & NOTES:', 50, y);
        doc.fillColor('#444444').fontSize(9).font('Helvetica').text(prescription.notes, 55, y + 15);
        y += 40;
      }

      // Next Visit
      if (prescription.nextVisitDate) {
        if (y > 720) { doc.addPage(); y = 50; }
        doc.roundedRect(50, y, 500, 25, 5).fill('#fffbeb');
        doc.fillColor('#d97706').fontSize(8).font('Helvetica-Bold').text('NEXT VISIT SCHEDULED ON:', 65, y + 8);
        doc.fontSize(11).text(new Date(prescription.nextVisitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 65, y + 18);
        y += 40;
      }

      // Footer
      const footerY = 750;
      doc.moveTo(50, footerY).lineTo(550, footerY).strokeColor('#ff7a1a').lineWidth(1).stroke();
      doc.fillColor('#1d0d08').fontSize(10).font('Helvetica-Bold').text(prescription.doctorName || 'Dr. Saikiran Reddy', 400, footerY + 15);
      doc.fillColor('#666666').fontSize(8).font('Helvetica').text('BDS, MDS | Reg No: A-12345', 400, footerY + 28);
      doc.fillColor('#999999').fontSize(7).text('Thank you for trusting Siara Dental.', 50, footerY + 15);
      doc.text('www.siaradental.in', 50, footerY + 25);

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
