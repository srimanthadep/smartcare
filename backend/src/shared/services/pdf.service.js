import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function findAssetsDir(startDir) {
  let current = startDir;
  for (let i = 0; i < 6; i++) {
    const trial = path.join(current, 'assets');
    if (fs.existsSync(trial) && fs.statSync(trial).isDirectory()) {
      return trial;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.join(process.cwd(), 'assets');
}

const ASSETS_DIR = findAssetsDir(__dirname);
const LOGO_PATH = path.join(ASSETS_DIR, 'logo.png');
const SIGN_PATH = path.join(ASSETS_DIR, 'sign.png');
// Prefer a root-level stamp.png if the user placed one at the project root
const ROOT_STAMP_PATH = path.join(process.cwd(), 'stamp.png');
const STAMP_PATH = fs.existsSync(ROOT_STAMP_PATH) ? ROOT_STAMP_PATH : path.join(ASSETS_DIR, 'stamp.png');

console.log('PDF Service: Using ASSETS_DIR:', ASSETS_DIR);
console.log('PDF Service: Logo exists:', fs.existsSync(LOGO_PATH));
console.log('PDF Service: Sign exists:', fs.existsSync(SIGN_PATH));
console.log('PDF Service: Stamp exists:', fs.existsSync(STAMP_PATH));

// Dynamic asset loader returning paths
const getAssets = () => ({
  logo: fs.existsSync(LOGO_PATH) ? LOGO_PATH : null,
  sign: fs.existsSync(SIGN_PATH) ? SIGN_PATH : null,
  stamp: fs.existsSync(STAMP_PATH) ? STAMP_PATH : null,
});

// --- Clinic Constants ---
const CLINIC_NAME = "SIARA DENTAL";
const CLINIC_TAGLINE = "CREATING MILES OF SMILES";
const CLINIC_PHONE = "+91 91544 32363";
const CLINIC_EMAIL = "siaradental@gmail.com";
const CLINIC_WEB = "siaradental.in";
const CLINIC_ADDR = "Omini Hospital Road, New Nagole Main Rd,\nOpposite Nayara Petrol Bunk,\nHyderabad 500035";
const DOCTOR_NAME = "Dr. Sai Kiran";
const REG_NO = "A-15777";

// --- Design Tokens (Matching Frontend) ---
const P = {
  primary: '#F97316',      // Orange 500
  primaryDark: '#C2410C',  // Orange 700
  primaryLight: '#FFF7ED', // Orange 50
  dark: '#1F2937',         // Gray 800
  text: '#374151',         // Gray 700
  muted: '#6B7280',        // Gray 500
  border: '#E5E7EB',       // Gray 200
  bg: '#F9FAFB',           // Gray 50
  white: '#FFFFFF',
  emerald: '#10B981',
  destructive: '#EF4444',
};

// --- Helpers ---
function drawProfessionalHeader(doc, label, lightweight = false) {
  const pageWidth = 612; // Standard US Letter width in points (approx)
  // PDFKit default is 72 points per inch. A4 is 595.28 x 841.89 points.
  const W = doc.page.width;
  const H = 85;

  if (!lightweight) {
    // Background Header Area
    doc.rect(0, 0, W, H).fill(P.bg);

    // Top Primary Border
    doc.rect(0, 0, W, 3).fill(P.primary);
  }

  const assets = getAssets();
  // Logo (omit for lightweight)
  if (!lightweight && assets.logo) {
    try { doc.image(assets.logo, 40, 15, { width: 55 }); } catch (e) { console.error('PDF Service: Error drawing logo image:', e.message); }
  }

  // Clinic Info
  doc.fillColor(P.primary).font('Helvetica-Bold').fontSize(24).text(CLINIC_NAME, 110, 25);
  doc.fillColor(P.muted).font('Helvetica-Bold').fontSize(8).text(CLINIC_TAGLINE, 111, 55, { characterSpacing: 1.2 });

  // Address & Contact (Right Aligned)
  doc.fillColor(P.text).font('Helvetica').fontSize(8);
  const addrLines = CLINIC_ADDR.split("\n");
  let addrY = 20;
  addrLines.forEach(line => {
    doc.text(line, 0, addrY, { align: 'right', width: W - 40 });
    addrY += 10;
  });

  doc.fillColor(P.primaryDark).font('Helvetica-Bold').text(`${CLINIC_WEB} | ${CLINIC_PHONE}`, 0, 55, { align: 'right', width: W - 40 });

  // Document Badge
  if (!lightweight) {
    const badgeW = 100;
    doc.roundedRect(W - 40 - badgeW, 68, badgeW, 15, 2).fill(P.primary);
    doc.fillColor(P.white).font('Helvetica-Bold').fontSize(10).text(label, W - 40 - badgeW, 71.5, { width: badgeW, align: 'center', characterSpacing: 1 });
  }

  return H;
}

function drawProfessionalFooter(doc) {
  const W = doc.page.width;
  const pageHeight = doc.page.height;
  const footerY = pageHeight - 40;

  doc.moveTo(40, footerY).lineTo(W - 40, footerY).strokeColor(P.border).lineWidth(0.5).stroke();

  doc.fillColor(P.primary).font('Helvetica-Bold').fontSize(7.5);
  doc.text(`Siara Dental - ${CLINIC_WEB} | ${CLINIC_PHONE}`, 0, footerY + 10, { align: 'center', width: W });
  doc.text("Professional Care · Personal Touch", 0, footerY + 20, { align: 'center', width: W });
}

function drawSectionHeader(doc, label, y) {
  const W = doc.page.width;
  doc.rect(40, y, W - 80, 12).fill(P.primaryLight);
  doc.rect(40, y, 4, 12).fill(P.primary);

  doc.fillColor(P.primaryDark).font('Helvetica-Bold').fontSize(9).text(label.toUpperCase(), 50, y + 2.5);
  return y + 20;
}

function drawSignatureBlock(doc, y, doctorName, doctorDetails) {
  const assets = getAssets();
  const W = doc.page.width;
  const sigX = W - 260; // Entire block ends at W - 40 (the margin)

  // Signature
  if (assets.sign) {
    try {
      doc.image(assets.sign, sigX + 50, y - 105, { width: 110 });
    } catch (e) {
      console.error('PDF Service: Error drawing sign in block:', e.message);
    }
  }

  // Stamp
  if (assets.stamp) {
    try {
      // Draw stamp only once per document (guard against accidental double-draws)
      if (!doc.__siara_stamp_drawn) {
        doc.image(assets.stamp, sigX + 160, y - 45, { width: 80 });
        doc.__siara_stamp_drawn = true;
      }
    } catch (e) {
      console.error('PDF Service: Error drawing stamp in block:', e.message);
    }
  }



  doc.fillColor(P.primary).font('Helvetica-Bold').fontSize(10).text(doctorName || 'Dr. Sai Kiran', sigX, y + 5, { align: 'center', width: 220 });
  if (doctorDetails) {
    doc.fillColor(P.muted).font('Helvetica').fontSize(8).text(`${doctorDetails.qualifications || 'BDS, MDS'} | Reg: ${doctorDetails.registration_number || 'A-4428'}`, sigX, y + 17, { align: 'center', width: 220 });
  }
}

async function downloadImage(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    try {
      // Attempt to optimize image size for PDFs (max width 1200px, quality 75)
      const sharp = await import('sharp');
      const optimized = await sharp.default(buf).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
      return optimized;
    } catch (e) {
      // If sharp not available or fails, return original buffer
      return buf;
    }
  } catch (error) {
    console.error('PDF Service: Error downloading image:', error.message, 'URL:', url);
    return null;
  }
}

export const pdfService = {
  async generatePrescriptionPDF(patient, prescription, xrays = [], opts = {}) {
    const { dbService } = await import('../../core/db/db.service.js');
    let doctorDetails = { qualifications: 'BDS, MDS', registration_number: 'A-4428' };
    try {
      if (prescription.doctorName) {
        const res = await dbService.query('SELECT qualifications, registration_number FROM doctors WHERE name = $1 LIMIT 1', [prescription.doctorName]);
        if (res.rows.length > 0) doctorDetails = res.rows[0];
      }
    } catch (e) { }

    return new Promise(async (resolve) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 0, left: 40, right: 40 } });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const startY = drawProfessionalHeader(doc, "PRESCRIPTION", !!opts.lightweight);
      let y = startY + 20;
      const W = doc.page.width;

      // Patient Snapshot
      doc.fillColor(P.muted).font('Helvetica-Bold').fontSize(8).text('PATIENT NAME:', 40, y);
      doc.fillColor(P.text).font('Helvetica').fontSize(9).text((patient.name || 'Unknown Patient').toUpperCase(), 120, y);
      y += 12;
      doc.fillColor(P.muted).font('Helvetica-Bold').text('PATIENT ID:', 40, y);
      doc.fillColor(P.text).font('Helvetica').text(patient.id || 'N/A', 120, y);
      y += 12;
      doc.fillColor(P.muted).font('Helvetica-Bold').text('AGE / GENDER:', 40, y);
      doc.fillColor(P.text).font('Helvetica').text(`${patient.age || '-'}Y / ${patient.gender || '-'}`, 120, y);
      y += 12;
      doc.fillColor(P.muted).font('Helvetica-Bold').text('DATE:', 40, y);
      doc.fillColor(P.text).font('Helvetica').text(new Date(prescription.date).toLocaleDateString('en-GB'), 120, y);

      y += 20;

      // Clinical Details
      if (prescription.chiefComplaint) {
        y = drawSectionHeader(doc, "Chief Complaint", y);
        doc.fillColor(P.text).font('Helvetica').fontSize(9).text(prescription.chiefComplaint, 50, y, { width: W - 100 });
        y += (doc.heightOfString(prescription.chiefComplaint, { width: W - 100 }) + 15);
      }

      if (prescription.diagnosis) {
        y = drawSectionHeader(doc, "Diagnosis", y);
        doc.fillColor(P.text).font('Helvetica').fontSize(9).text(prescription.diagnosis, 50, y, { width: W - 100 });
        y += (doc.heightOfString(prescription.diagnosis, { width: W - 100 }) + 15);
      }

      // Treatment Plan
      if (prescription.treatmentPlan && prescription.treatmentPlan.length > 0) {
        y = drawSectionHeader(doc, "Treatment Plan", y);
        prescription.treatmentPlan.forEach(p => {
          doc.fillColor(P.text).font('Helvetica-Bold').fontSize(9).text(p.name, 50, y);
          if (p.description) {
            doc.fillColor(P.muted).font('Helvetica').fontSize(8).text(p.description, 50, y + 10);
            y += 22;
          } else {
            y += 14;
          }
        });
        y += 10;
      }

      // Medications
      y = drawSectionHeader(doc, "Medications (Rx)", y);
      doc.fillColor(P.primaryDark).font('Helvetica-Bold').fontSize(8);
      doc.text('Medicine Name', 50, y);
      doc.text('Dosage', 220, y);
      doc.text('Frequency', 340, y);
      doc.text('Duration', 460, y);
      y += 12;
      doc.moveTo(40, y).lineTo(W - 40, y).strokeColor(P.border).lineWidth(0.5).stroke();
      y += 10;

      doc.fillColor(P.text).font('Helvetica').fontSize(9);
      prescription.medicines.forEach(m => {
        if (y > doc.page.height - 100) { doc.addPage(); y = 40; }
        doc.font('Helvetica-Bold').text(m.name, 50, y);
        doc.font('Helvetica').text(m.dosage, 220, y);
        doc.text(m.frequency || "—", 340, y);
        doc.text(m.duration || "—", 460, y);
        y += 18;
      });

      // Advice
      if (prescription.notes) {
        y += 15;
        y = drawSectionHeader(doc, "Advice & Notes", y);
        doc.fillColor(P.text).font('Helvetica').fontSize(9).text(prescription.notes, 50, y, { width: W - 100 });
      }

      // Signature Area
      const sigY = doc.page.height - 110;
      if (prescription.nextVisitDate) {
        doc.fillColor(P.primaryDark).font('Helvetica-Bold').fontSize(9).text(`Next Review: ${new Date(prescription.nextVisitDate).toLocaleDateString('en-GB')}`, 40, sigY + 15);
      }

      drawSignatureBlock(doc, sigY, prescription.doctorName, doctorDetails);

      drawProfessionalFooter(doc);

      // Append X-Rays if any
      if (xrays && xrays.length > 0) {
        for (const xray of xrays) {
          doc.addPage();
          drawProfessionalHeader(doc, "X-RAY ATTACHMENT");
          
          let curY = 110;
          doc.fillColor(P.primaryDark).font('Helvetica-Bold').fontSize(11).text(`${xray.type} X-Ray - ${new Date(xray.takenDate || xray.createdAt).toLocaleDateString('en-GB')}`, 40, curY);
          curY += 20;

          const imgBuffer = await downloadImage(xray.fileUrl);
          if (imgBuffer) {
            try {
              // Maintain aspect ratio, max width 500, max height 400
              doc.image(imgBuffer, 40, curY, { fit: [512, 400], align: 'center' });
              curY += 410;
            } catch (e) {
              doc.fillColor(P.destructive).text('Error loading X-ray image.', 40, curY);
              curY += 20;
            }
          }

          if (xray.diagnosis) {
            curY = drawSectionHeader(doc, "X-Ray Diagnosis", curY);
            doc.fillColor(P.text).font('Helvetica').fontSize(9).text(xray.diagnosis, 50, curY, { width: W - 100 });
            curY += (doc.heightOfString(xray.diagnosis, { width: W - 100 }) + 15);
          }

          if (xray.notes) {
            curY = drawSectionHeader(doc, "X-Ray Notes", curY);
            doc.fillColor(P.text).font('Helvetica').fontSize(9).text(xray.notes, 50, curY, { width: W - 100 });
          }

          drawProfessionalFooter(doc);
        }
      }

      doc.end();
    });
  },

  async generateXRayReportPDF(patient, xray, opts = {}) {
    const { dbService } = await import('../../core/db/db.service.js');
    let doctorDetails = { qualifications: 'BDS, MDS', registration_number: 'A-4428' };
    
    return new Promise(async (resolve) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 0, left: 40, right: 40 } });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const startY = drawProfessionalHeader(doc, "RADIOLOGY REPORT", !!opts.lightweight);
      let y = startY + 20;
      const W = doc.page.width;

      // Patient Snapshot
      doc.fillColor(P.muted).font('Helvetica-Bold').fontSize(8).text('PATIENT NAME:', 40, y);
      doc.fillColor(P.text).font('Helvetica').fontSize(9).text((patient.name || 'Unknown Patient').toUpperCase(), 120, y);
      y += 12;
      doc.fillColor(P.muted).font('Helvetica-Bold').text('PATIENT ID:', 40, y);
      doc.fillColor(P.text).font('Helvetica').text(patient.id || 'N/A', 120, y);
      y += 12;
      doc.fillColor(P.muted).font('Helvetica-Bold').text('AGE / GENDER:', 40, y);
      doc.fillColor(P.text).font('Helvetica').text(`${patient.age || '-'}Y / ${patient.gender || '-'}`, 120, y);
      y += 12;
      doc.fillColor(P.muted).font('Helvetica-Bold').text('DATE:', 40, y);
      doc.fillColor(P.text).font('Helvetica').text(new Date(xray.takenDate || xray.createdAt).toLocaleDateString('en-GB'), 120, y);

      y += 30;

      // X-Ray Type Header
      doc.fillColor(P.primaryDark).font('Helvetica-Bold').fontSize(14).text(`${xray.type} X-Ray Investigation`, 40, y);
      y += 25;

      // Image
      const imgBuffer = await downloadImage(xray.fileUrl);
      if (imgBuffer) {
        try {
          doc.image(imgBuffer, 40, y, { fit: [512, 350], align: 'center' });
          y += 360;
        } catch (e) {
          doc.fillColor(P.destructive).text('Error loading image.', 40, y);
          y += 20;
        }
      }

      // Diagnosis
      if (xray.diagnosis) {
        y = drawSectionHeader(doc, "Clinical Diagnosis", y);
        doc.fillColor(P.text).font('Helvetica').fontSize(10).text(xray.diagnosis, 50, y, { width: W - 100 });
        y += (doc.heightOfString(xray.diagnosis, { width: W - 100 }) + 20);
      }

      // Notes
      if (xray.notes) {
        y = drawSectionHeader(doc, "Clinical Notes / Findings", y);
        doc.fillColor(P.text).font('Helvetica').fontSize(10).text(xray.notes, 50, y, { width: W - 100 });
      }

      // Signature Area
      const sigY = doc.page.height - 110;
      drawSignatureBlock(doc, sigY, xray.reviewedBy || DOCTOR_NAME, doctorDetails);

      drawProfessionalFooter(doc);
      doc.end();
    });
  },

  async generateInvoicePDF(patient, invoice, opts = {}) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 0, left: 40, right: 40 } });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const startY = drawProfessionalHeader(doc, "TAX INVOICE", !!opts.lightweight);
      let y = startY + 20;
      const W = doc.page.width;

      // Bill To
      doc.fillColor(P.muted).font('Helvetica-Bold').fontSize(8).text('BILL TO', 40, y);
      doc.fillColor(P.dark).font('Helvetica-Bold').fontSize(11).text((patient.name || 'Unknown Patient').toUpperCase(), 40, y + 10);
      doc.fillColor(P.text).font('Helvetica').fontSize(8).text(`Patient ID: ${patient.id || 'N/A'}`, 40, y + 22);
      doc.text(`Contact: ${patient.phone || 'N/A'}`, 40, y + 32);

      // Invoice Details
      doc.fillColor(P.muted).font('Helvetica-Bold').text('INVOICE DETAILS', 0, y, { align: 'right', width: W - 40 });
      doc.fillColor(P.text).font('Helvetica').text(`Invoice No: ${invoice.id}`, 0, y + 10, { align: 'right', width: W - 40 });
      doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-GB')}`, 0, y + 20, { align: 'right', width: W - 40 });

      const statusColor = invoice.status === "Paid" ? P.emerald : P.destructive;
      doc.fillColor(statusColor).font('Helvetica-Bold').text(`Status: ${invoice.status.toUpperCase()}`, 0, y + 30, { align: 'right', width: W - 40 });

      y += 60;

      // Table Header
      doc.rect(40, y, W - 80, 20).fill(P.primary);
      doc.fillColor(P.white).font('Helvetica-Bold').fontSize(9);
      doc.text('S.No', 50, y + 6);
      doc.text('Description / Procedure', 100, y + 6);
      doc.text('Tooth', 350, y + 6);
      doc.text('Amount (INR)', 450, y + 6, { align: 'right', width: 100 });
      y += 25;

      // Table Body
      doc.fillColor(P.text).font('Helvetica').fontSize(9);
      invoice.items.forEach((item, i) => {
        doc.text(i + 1, 50, y);
        doc.text(item.description, 100, y, { width: 240 });
        doc.text(item.toothNumber || "—", 350, y);
        doc.font('Helvetica-Bold').text(item.amount.toLocaleString("en-IN"), 450, y, { align: 'right', width: 100 });
        y += 20;
        doc.moveTo(40, y - 5).lineTo(W - 40, y - 5).strokeColor(P.border).lineWidth(0.5).stroke();
      });

      y += 10;
      // Calculations
      const calcX = W - 180;
      doc.fillColor(P.muted).font('Helvetica').fontSize(9).text("Subtotal", calcX, y);
      doc.fillColor(P.dark).font('Helvetica-Bold').text(`INR ${invoice.total.toLocaleString("en-IN")}`, 0, y, { align: 'right', width: W - 40 });

      if (invoice.payments && invoice.payments.length > 0) {
        invoice.payments.forEach(pay => {
          y += 15;
          doc.fillColor(P.muted).font('Helvetica').fontSize(8).text(`Payment (${new Date(pay.date).toLocaleDateString('en-GB')})`, calcX, y);
          doc.fillColor(P.text).text(`- INR ${pay.amount.toLocaleString("en-IN")}`, 0, y, { align: 'right', width: W - 40 });
        });
      }

      y += 20;
      doc.rect(calcX - 10, y - 5, 150, 20).fill(P.primaryLight);
      doc.fillColor(P.primaryDark).font('Helvetica-Bold').fontSize(10).text("BALANCE DUE", calcX, y + 2);
      const balance = invoice.total - (invoice.paidAmount || 0);
      doc.text(`INR ${balance.toLocaleString("en-IN")}`, 0, y + 2, { align: 'right', width: W - 40 });

      // Footer Sign
      const sigY = doc.page.height - 110;

      drawSignatureBlock(doc, sigY, DOCTOR_NAME, `BDS, MDS | Reg. No: ${REG_NO}`);

      drawProfessionalFooter(doc);
      doc.end();
    });
  }
};
