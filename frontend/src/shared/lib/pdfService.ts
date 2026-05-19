import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Patient, Prescription } from "@/shared/types";
import logo from "@/assets/logo.png";
import sign from "@/assets/sign.png";
import stamp from "@/assets/stamp.png";

// If the user placed a `stamp.png` at the project root or public root, prefer that
let runtimeStampDataUrl: string | null = null;
async function ensureRuntimeStampLoaded() {
  if (typeof window === 'undefined') return; // only run in browser
  if (runtimeStampDataUrl) return;
  try {
    const resp = await fetch('/stamp.png');
    if (!resp.ok) return;
    const blob = await resp.blob();
    return await new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        runtimeStampDataUrl = reader.result as string;
        resolve();
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    // ignore
  }
}

// ─── Clinic Constants ────────────────────────────────────────────────────────
const CLINIC_NAME = "SIARA DENTAL";
const CLINIC_TAGLINE = "CREATING MILES OF SMILES";
const CLINIC_PHONE = "+91 89198 78543";
const CLINIC_EMAIL = "care@siaradental.in";
const CLINIC_WEB = "siaradental.in";
const CLINIC_ADDR = "Omini Hospital Road, New Nagole Main Rd,\nOpposite Nayara Petrol Bunk,\nHyderabad 500035";
const DOCTOR_NAME = "Dr. Sai Kiran";
const REG_NO = "A-4428";

// ─── Brand Design Tokens ─────────────────────────────────────────────────────
const P = {
  primary: [249, 115, 22] as [number, number, number], // Orange 500
  primaryDark: [194, 65, 12] as [number, number, number], // Orange 700
  primaryLight: [255, 247, 237] as [number, number, number], // Orange 50
  dark: [31, 41, 55] as [number, number, number], // Gray 800
  text: [55, 65, 81] as [number, number, number], // Gray 700
  muted: [107, 114, 128] as [number, number, number], // Gray 500
  border: [229, 231, 235] as [number, number, number], // Gray 200
  bg: [249, 250, 251] as [number, number, number], // Gray 50
  white: [255, 255, 255] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  destructive: [239, 68, 68] as [number, number, number],
};

// ─── Shared Helpers ──────────────────────────────────────────────────────────
const setC = (doc: jsPDF, c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
const setF = (doc: jsPDF, c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
const setS = (doc: jsPDF, c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

function drawProfessionalHeader(doc: jsPDF, pageWidth: number, label: string) {
  const H = 65;

  // Background Header Area
  setF(doc, P.bg);
  doc.rect(0, 0, pageWidth, H, "F");

  // Top Primary Border
  setF(doc, P.primary);
  doc.rect(0, 0, pageWidth, 2, "F");

  // Logo
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 15, 12, 18, 18);
    } catch (e) {
      console.error("Logo failed to load", e);
    }
  }

  // Clinic Info
  setC(doc, P.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(CLINIC_NAME, 55, 28);

  setC(doc, P.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(CLINIC_TAGLINE, 56, 34, { charSpace: 1 });

  // Address & Contact (Right Aligned)
  setC(doc, P.text);
  doc.setFontSize(8.5);
  const addrLines = CLINIC_ADDR.split("\n");
  doc.text(addrLines, pageWidth - 15, 22, { align: "right" });

  setC(doc, P.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.text(`${CLINIC_WEB} | ${CLINIC_PHONE}`, pageWidth - 15, 38, { align: "right" });

  setC(doc, P.muted);
  doc.setFont("helvetica", "normal");
  doc.text(`Reg. No: ${REG_NO}`, pageWidth - 15, 43, { align: "right" });

  // Document Badge - Wider and centered
  const badgeW = 75;
  setF(doc, P.primary);
  doc.roundedRect(pageWidth - 15 - badgeW, 48, badgeW, 11, 1, 1, "F");
  setC(doc, P.white);
  doc.setFontSize(12);
  doc.text(label, pageWidth - 15 - (badgeW / 2), 55.5, { align: "center", charSpace: 1.5 });

  return H;
}

function drawProfessionalFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
  const footerY = pageHeight - 20;

  setS(doc, P.border);
  doc.setLineWidth(0.2);
  doc.line(15, footerY, pageWidth - 15, footerY);

  setC(doc, P.primary);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Siara Dental - ${CLINIC_WEB} | ${CLINIC_PHONE}`, pageWidth / 2, footerY + 8, { align: "center" });
  doc.text("Professional Care · Personal Touch", pageWidth / 2, footerY + 12, { align: "center" });
}

function drawSectionHeader(doc: jsPDF, label: string, y: number, pageWidth: number) {
  setF(doc, P.primaryLight);
  doc.rect(15, y, pageWidth - 30, 8, "F");

  setF(doc, P.primary);
  doc.rect(15, y, 3, 8, "F");

  setC(doc, P.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(label.toUpperCase(), 22, y + 5.5);

  return y + 12;
}

// ─── Main Service ────────────────────────────────────────────────────────────
export const pdfService = {
  async generatePrescriptionPDF(patient: Patient, prescription: Prescription) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const startY = drawProfessionalHeader(doc, W, "PRESCRIPTION");
    let y = startY + 15;

    // ── Patient Snapshot ──────────────────────────────────────────────────────
    const patientFields = [
      ["Patient Name:", patient.name.toUpperCase()],
      ["Patient ID:", patient.id],
      ["Age / Gender:", `${patient.age}Y / ${patient.gender}`],
      ["Date:", new Date(prescription.date).toLocaleDateString('en-GB')],
    ];

    autoTable(doc, {
      startY: y,
      body: patientFields,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1, textColor: P.text },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 30, textColor: P.muted },
        1: { cellWidth: 60 }
      },
      margin: { left: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Clinical Details ──────────────────────────────────────────────────────
    // Chief Complaint
    if (prescription.chiefComplaint) {
      y = drawSectionHeader(doc, "Chief Complaint", y, W);
      setC(doc, P.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(prescription.chiefComplaint, W - 35);
      doc.text(lines, 20, y);
      y += (lines.length * 5) + 10;
    }

    // Diagnosis
    if (prescription.diagnosis) {
      y = drawSectionHeader(doc, "Diagnosis", y, W);
      setC(doc, P.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(prescription.diagnosis, W - 35);
      doc.text(lines, 20, y);
      y += (lines.length * 5) + 10;
    }

    // Treatment Plan (Summary)
    if (prescription.treatmentPlan && prescription.treatmentPlan.length > 0) {
      y = drawSectionHeader(doc, "Suggested Treatment Plan", y, W);
      const tpBody = prescription.treatmentPlan.map(p => [p.name, p.description || "—"]);

      autoTable(doc, {
        startY: y,
        head: [["Procedure", "Description"]],
        body: tpBody,
        theme: "plain",
        headStyles: { fillColor: P.primaryLight, textColor: P.primaryDark, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 9, textColor: P.text },
        margin: { left: 15, right: 15 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } }
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    }

    // ── Medications ───────────────────────────────────────────────────────────
    y = drawSectionHeader(doc, "Medications (Rx)", y, W);
    const medBody = prescription.medicines.map(m => [
      m.name,
      m.dosage,
      m.duration || "—",
      m.instructions || m.frequency || "—"
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Medicine Name", "Dosage", "Duration", "Instructions"]],
      body: medBody.length ? medBody : [["No medicines prescribed", "", "", ""]],
      theme: "plain",
      headStyles: { fillColor: P.primaryLight, textColor: P.primaryDark, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 9, textColor: P.text, cellPadding: 4 },
      alternateRowStyles: { fillColor: P.bg },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // ── Advice & Notes ────────────────────────────────────────────────────────
    if (prescription.notes) {
      y = drawSectionHeader(doc, "Advice & Notes", y, W);
      setC(doc, P.text);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(prescription.notes, W - 35);
      doc.text(lines, 20, y);
      y += (lines.length * 5) + 15;
    }

    // ── Next Visit & Signature ────────────────────────────────────────────────
    if (prescription.nextVisitDate) {
      setC(doc, P.primaryDark);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Next Review: ${new Date(prescription.nextVisitDate).toLocaleDateString('en-GB')}`, 15, H - 45);
    }

    const sigX = W - 105;
    const sigY = H - 45;

    // Signature
    try {
      doc.addImage(sign, "PNG", sigX + 50, sigY - 85, 45, 18);
    } catch (e) {
      console.error("Signature failed", e);
    }

    // Stamp (prefer runtime /stamp.png if present)
    try {
      await ensureRuntimeStampLoaded();
      const stampSrc = runtimeStampDataUrl || stamp;
      doc.addImage(stampSrc as any, "PNG", sigX + 85, sigY - 30, 30, 30);
    } catch (e) {
      console.error("Stamp failed", e);
    }

    setC(doc, P.dark);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(DOCTOR_NAME, W - 15, sigY, { align: "right" });
    setC(doc, P.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`BDS, MDS (Reg. No: ${REG_NO})`, W - 15, sigY + 5, { align: "right" });
    doc.text("Dental Surgeon", W - 15, sigY + 9, { align: "right" });

    drawProfessionalFooter(doc, W, H);
    doc.save(`Prescription_${patient.name.replace(/\s+/g, '_')}_${prescription.id}.pdf`);
  },

  async generateInvoicePDF(patient: Patient, invoice: Invoice) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const startY = drawProfessionalHeader(doc, W, "TAX INVOICE");
    let y = startY + 15;

    // ── Bill Information ──────────────────────────────────────────────────────
    // Left: Patient Info
    setC(doc, P.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO", 15, y);

    setC(doc, P.dark);
    doc.setFontSize(11);
    doc.text(patient.name.toUpperCase(), 15, y + 6);

    setC(doc, P.text);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Patient ID: ${patient.id}`, 15, y + 11);
    doc.text(`Contact: ${patient.phone}`, 15, y + 16);

    // Right: Invoice Details
    setC(doc, P.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE DETAILS", W - 15, y, { align: "right" });

    setC(doc, P.text);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice No: ${invoice.id}`, W - 15, y + 6, { align: "right" });
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-GB')}`, W - 15, y + 11, { align: "right" });

    const statusColor = invoice.status === "Paid" ? P.emerald : P.destructive;
    setC(doc, statusColor);
    doc.setFont("helvetica", "bold");
    doc.text(`Status: ${invoice.status.toUpperCase()}`, W - 15, y + 16, { align: "right" });

    y += 30;

    // ── Itemized Table ────────────────────────────────────────────────────────
    autoTable(doc, {
      startY: y,
      head: [["S.No", "Description / Procedure", "Tooth", "Amount (INR)"]],
      body: invoice.items.map((item, i) => [
        (i + 1).toString(),
        item.description,
        item.toothNumber || "—",
        item.amount.toLocaleString("en-IN")
      ]),
      theme: "plain",
      headStyles: { fillColor: P.primary, textColor: P.white, fontSize: 9, fontStyle: "bold", cellPadding: 4 },
      bodyStyles: { fontSize: 9, textColor: P.text, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 35, halign: "right", fontStyle: "bold" }
      },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Financial Calculation ─────────────────────────────────────────────────
    const calcW = 70;
    const calcX = W - 15 - calcW;

    // Subtotal
    setC(doc, P.muted);
    doc.setFontSize(9);
    doc.text("Subtotal", calcX, y);
    setC(doc, P.dark);
    doc.text(`INR ${invoice.total.toLocaleString("en-IN")}`, W - 15, y, { align: "right" });

    // Payment History
    if (invoice.payments && invoice.payments.length > 0) {
      invoice.payments.forEach(pay => {
        y += 6;
        setC(doc, P.muted);
        doc.setFontSize(8);
        doc.text(`Payment (${new Date(pay.date).toLocaleDateString('en-GB')})`, calcX, y);
        setC(doc, P.text);
        doc.text(`- INR ${pay.amount.toLocaleString("en-IN")}`, W - 15, y, { align: "right" });
      });
    }

    y += 8;
    setF(doc, P.primaryLight);
    doc.rect(calcX - 5, y - 5, calcW + 5, 12, "F");

    setC(doc, P.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BALANCE DUE", calcX, y + 3);

    const balance = invoice.total - (invoice.paidAmount || 0);
    doc.text(`INR ${balance.toLocaleString("en-IN")}`, W - 15, y + 3, { align: "right" });

    // ── Footer & Sign ─────────────────────────────────────────────────────────
    drawProfessionalFooter(doc, W, H);

    setC(doc, P.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("This is a computer generated invoice and does not require a physical signature.", W / 2, H - 35, { align: "center" });

    // Signature Area
    const sigX = W - 110;
    const sigY = H - 55;

    // Signature
    try {
      doc.addImage(sign, "PNG", sigX + 50, sigY - 105, 50, 20);
    } catch (e) {
      console.error("Signature failed", e);
    }

    // Stamp (prefer runtime /stamp.png if present)
    try {
      await ensureRuntimeStampLoaded();
      const stampSrc = runtimeStampDataUrl || stamp;
      doc.addImage(stampSrc as any, "PNG", sigX + 90, sigY - 45, 35, 35);
    } catch (e) {
      console.error("Stamp failed", e);
    }

    setC(doc, P.primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(DOCTOR_NAME, W - 15, sigY, { align: "right" });

    setC(doc, P.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`BDS, MDS | Reg. No: ${REG_NO}`, W - 15, sigY + 5, { align: "right" });

    doc.save(`Invoice_${invoice.id}_${patient.name.replace(/\s+/g, '_')}.pdf`);
  },
};
