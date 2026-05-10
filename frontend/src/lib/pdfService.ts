import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Patient, Prescription } from "@/types";
import logo from "@/assets/logo.png";

// ─── Clinic Constants ────────────────────────────────────────────────────────
const CLINIC_NAME    = "SIARA DENTAL";
const CLINIC_TAGLINE = "CREATING MILES OF SMILES";
const CLINIC_PHONE   = "+91 89198 78543";
const CLINIC_EMAIL   = "care@siaradental.in";
const CLINIC_WEB     = "www.siaradental.in";
const CLINIC_ADDR    = "Omini Hospital Road, opp. Nayara Petrol bunk,\nHyderabad, Telangana 500035";

// ─── Brand Colors ────────────────────────────────────────────────────────────
const C = {
  dark:       [28, 18, 13]   as [number,number,number],
  orange:     [249, 115, 22] as [number,number,number],
  orangeLight:[255, 247, 237] as [number,number,number],
  orangeMid:  [254, 215, 170] as [number,number,number],
  white:      [255, 255, 255] as [number,number,number],
  gray100:    [248, 248, 248] as [number,number,number],
  gray200:    [230, 230, 230] as [number,number,number],
  gray400:    [160, 160, 160] as [number,number,number],
  gray600:    [80, 80, 80]    as [number,number,number],
  text:       [30, 30, 30]    as [number,number,number],
  green:      [22, 163, 74]   as [number,number,number],
  red:        [220, 38, 38]   as [number,number,number],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const setFill   = (doc: jsPDF, c: [number,number,number]) => doc.setFillColor(c[0], c[1], c[2]);
const setStroke = (doc: jsPDF, c: [number,number,number]) => doc.setDrawColor(c[0], c[1], c[2]);
const setColor  = (doc: jsPDF, c: [number,number,number]) => doc.setTextColor(c[0], c[1], c[2]);

function drawHeader(doc: jsPDF, pageWidth: number, badgeLabel: string) {
  const H = 62;

  // Dark background
  setFill(doc, C.dark);
  doc.rect(0, 0, pageWidth, H, "F");

  // Orange left accent bar
  setFill(doc, C.orange);
  doc.rect(0, 0, 4, H, "F");

  // Logo
  try { doc.addImage(logo, "PNG", 11, 9, 40, 40); } catch (_) {}

  // Clinic Name
  setColor(doc, C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(CLINIC_NAME, 56, 30);

  // Tagline
  setColor(doc, C.orange);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(CLINIC_TAGLINE, 57, 37, { charSpace: 1.5 });

  // Right — contact info
  setColor(doc, [200, 200, 200]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const addr = CLINIC_ADDR.split("\n");
  doc.text(addr[0], pageWidth - 10, 18, { align: "right" });
  doc.text(addr[1], pageWidth - 10, 24, { align: "right" });

  // Orange thin separator
  setStroke(doc, C.orange);
  doc.setLineWidth(0.2);
  doc.line(pageWidth - 80, 27, pageWidth - 10, 27);

  setColor(doc, [200, 200, 200]);
  doc.setFontSize(7.5);
  doc.text(`Ph: ${CLINIC_PHONE}`, pageWidth - 10, 32, { align: "right" });
  doc.text(CLINIC_EMAIL, pageWidth - 10, 37, { align: "right" });
  doc.text(CLINIC_WEB,   pageWidth - 10, 42, { align: "right" });

  // Floating badge overlapping header / content
  const bw = 88;
  const bh = 13;
  const bx = pageWidth / 2 - bw / 2;
  const by = H - 7;
  setFill(doc, C.orange);
  doc.roundedRect(bx, by, bw, bh, 4, 4, "F");
  setColor(doc, C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(badgeLabel, pageWidth / 2, by + 9, { align: "center", charSpace: 2 });

  return H; // return header height for next element positioning
}

function drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
  const fh = 18;
  setFill(doc, C.dark);
  doc.rect(0, pageHeight - fh, pageWidth, fh, "F");

  setFill(doc, C.orange);
  doc.rect(0, pageHeight - fh, 4, fh, "F");

  setColor(doc, C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Thank You For Trusting", pageWidth / 2 - 12, pageHeight - 7, { align: "right" });

  setColor(doc, C.orange);
  doc.text("Siara Dental", pageWidth / 2 - 10, pageHeight - 7);

  setColor(doc, C.gray400);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(CLINIC_WEB, pageWidth - 10, pageHeight - 7, { align: "right" });
}

function drawInfoGrid(
  doc: jsPDF,
  fields: { label: string; value: string }[],
  startY: number,
  pageWidth: number,
  cols = 2,
  rowGap = 18
) {
  const margin = 12;
  const colW = (pageWidth - margin * 2) / cols;

  fields.forEach((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * colW;
    const y = startY + row * rowGap;

    // Label
    setColor(doc, C.gray400);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(f.label.toUpperCase(), x, y);

    // Value
    setColor(doc, C.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(f.value || "—", x, y + 6);

    // Underline
    setStroke(doc, C.gray200);
    doc.setLineWidth(0.4);
    doc.line(x, y + 8.5, x + colW - 6, y + 8.5);
  });

  const rows = Math.ceil(fields.length / cols);
  return startY + rows * rowGap + 4;
}

function sectionHeader(doc: jsPDF, label: string, y: number, pageWidth: number) {
  setFill(doc, C.dark);
  doc.roundedRect(12, y, pageWidth - 24, 9, 2, 2, "F");
  setFill(doc, C.orange);
  doc.roundedRect(12, y, 3, 9, 1, 1, "F");
  setColor(doc, C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(label, 19, y + 6.2);
  return y + 9;
}

// ─── Prescription PDF ─────────────────────────────────────────────────────────
export const pdfService = {
  async generatePrescriptionPDF(patient: Patient, prescription: Prescription) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const headerH = drawHeader(doc, W, "PRESCRIPTION");
    let y = headerH + 14;

    // ── Patient Info Grid ─────────────────────────────────────────────────────
    const dateStr = (d?: string) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "As required";

    y = drawInfoGrid(doc, [
      { label: "Patient Name",    value: patient.name },
      { label: "Date",            value: dateStr(prescription.date) },
      { label: "Age / Gender",    value: `${patient.age}Y / ${patient.gender}` },
      { label: "Prescription ID", value: prescription.id },
      { label: "Patient ID",      value: patient.id },
      { label: "Next Visit",      value: dateStr(prescription.nextVisitDate) },
    ], y, W, 2, 18);

    y += 6;

    // ── Chief Complaint ───────────────────────────────────────────────────────
    if (prescription.chiefComplaint) {
      y = sectionHeader(doc, "Chief Complaint", y, W);
      y += 5;
      setColor(doc, C.gray600);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(prescription.chiefComplaint, W - 30);
      doc.text(lines, 16, y);
      y += lines.length * 5.5 + 6;
    }

    // ── Diagnosis ─────────────────────────────────────────────────────────────
    if (prescription.diagnosis) {
      y = sectionHeader(doc, "Diagnosis", y, W);
      y += 5;
      setColor(doc, C.gray600);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(prescription.diagnosis, W - 30);
      doc.text(lines, 16, y);
      y += lines.length * 5.5 + 6;
    }

    // ── Treatment Plan ────────────────────────────────────────────────────────
    if (prescription.treatmentPlan && prescription.treatmentPlan.length > 0) {
      y = sectionHeader(doc, "Treatment Plan", y, W);
      y += 2;
      
      const tpRows = prescription.treatmentPlan.map((p) => [
        p.name,
        p.description || "—",
        `Rs.${p.estimatedCost?.toLocaleString("en-IN") || "0"}`
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Phase / Procedure", "Description", "Est. Cost"]],
        body: tpRows,
        theme: "plain",
        headStyles: {
          fillColor: C.orangeLight,
          textColor: C.orange,
          fontSize: 8,
          fontStyle: "bold",
          cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        },
        bodyStyles: {
          fontSize: 8.5,
          cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
          textColor: C.text,
        },
        alternateRowStyles: { fillColor: C.gray100 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 50 },
          2: { halign: "right", fontStyle: "bold", cellWidth: 30 },
        },
        margin: { left: 12, right: 12 },
        tableLineColor: C.gray200,
        tableLineWidth: 0.3,
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Medications ───────────────────────────────────────────────────────────
    y = sectionHeader(doc, "Medications", y, W);
    y += 2;

    const medRows = prescription.medicines.map((m) => [
      m.name,
      m.dosage,
      m.duration || "—",
      m.instructions || m.frequency || "—",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Medicine", "Dosage", "Duration", "Instructions / Frequency"]],
      body: medRows.length ? medRows : [["No medications prescribed", "", "", ""]],
      theme: "plain",
      headStyles: {
        fillColor: C.orangeLight,
        textColor: C.orange,
        fontSize: 8,
        fontStyle: "bold",
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 8.5,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
        textColor: C.text,
      },
      alternateRowStyles: { fillColor: C.gray100 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { cellWidth: 28 },
        2: { cellWidth: 24 },
      },
      margin: { left: 12, right: 12 },
      tableLineColor: C.gray200,
      tableLineWidth: 0.3,
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── Notes / Advice ────────────────────────────────────────────────────────
    if (prescription.notes) {
      y = sectionHeader(doc, "Advice & Notes", y, W);
      y += 5;
      setFill(doc, C.orangeLight);
      setStroke(doc, C.orangeMid);
      doc.setLineWidth(0.3);
      const noteLines = doc.splitTextToSize(prescription.notes, W - 50);
      const boxH = noteLines.length * 5.5 + 10;
      doc.roundedRect(12, y, W - 60, boxH, 3, 3, "FD");
      setColor(doc, C.gray600);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(noteLines, 17, y + 7);
      y += boxH + 6;
    }

    // ── Signature ─────────────────────────────────────────────────────────────
    const sigX = W - 65;
    const sigY = H - 40;
    setStroke(doc, C.dark);
    doc.setLineWidth(0.5);
    doc.line(sigX, sigY, W - 12, sigY);
    setColor(doc, C.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(prescription.doctorName || "Dr. Saikiran Reddy", sigX + 26, sigY + 6, { align: "center" });
    setColor(doc, C.gray400);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("BDS, MDS  |  Reg No: A-12345", sigX + 26, sigY + 11, { align: "center" });

    drawFooter(doc, W, H);
    doc.save(`Prescription_${patient.name}_${prescription.id}.pdf`);
  },

  // ─── Invoice PDF ─────────────────────────────────────────────────────────────
  async generateInvoicePDF(patient: Patient, invoice: Invoice) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const headerH = drawHeader(doc, W, "INVOICE");
    let y = headerH + 14;

    // ── Meta Info Grid ────────────────────────────────────────────────────────
    y = drawInfoGrid(doc, [
      { label: "Patient Name", value: patient.name },
      { label: "Invoice No",   value: invoice.id },
      { label: "Patient ID",   value: patient.id },
      { label: "Invoice Date", value: invoice.date },
      { label: "Age / Gender", value: `${patient.age}Y / ${patient.gender}` },
      { label: "Payment",      value: invoice.status },
    ], y, W, 2, 16);

    y += 5;

    // ── Billing Table ─────────────────────────────────────────────────────────
    y = sectionHeader(doc, "Treatment & Billing Details", y, W);
    y += 2;

    const rows = invoice.items.map((item, i) => [
      String(i + 1),
      item.description + (item.toothNumber ? ` (Tooth #${item.toothNumber})` : ""),
      "1",
      `Rs.${item.amount.toLocaleString("en-IN")}`,
      `Rs.${item.amount.toLocaleString("en-IN")}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Description", "Qty", "Rate", "Amount"]],
      body: rows.length ? rows : [["—", "No items", "", "", ""]],
      theme: "plain",
      headStyles: {
        fillColor: C.orangeLight,
        textColor: C.orange,
        fontSize: 8,
        fontStyle: "bold",
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 8.5,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
        textColor: C.text,
      },
      alternateRowStyles: { fillColor: C.gray100 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        2: { cellWidth: 12, halign: "center" },
        3: { cellWidth: 28, halign: "right" },
        4: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      },
      margin: { left: 12, right: 12 },
      tableLineColor: C.gray200,
      tableLineWidth: 0.3,
    });

    y = (doc as any).lastAutoTable.finalY + 4;

    // ── Totals Block ──────────────────────────────────────────────────────────
    const totalBoxW = 70;
    const totalBoxX = W - 12 - totalBoxW;

    setFill(doc, C.gray100);
    setStroke(doc, C.gray200);
    doc.setLineWidth(0.3);
    doc.roundedRect(totalBoxX, y, totalBoxW, 24, 3, 3, "FD");

    setColor(doc, C.gray400);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Subtotal", totalBoxX + 5, y + 8);
    doc.text(`Rs.${invoice.total.toLocaleString("en-IN")}`, W - 15, y + 8, { align: "right" });

    setStroke(doc, C.gray200);
    doc.line(totalBoxX + 5, y + 12, W - 15, y + 12);

    setFill(doc, C.orange);
    doc.roundedRect(totalBoxX, y + 13, totalBoxW, 11, 2, 2, "F");
    setColor(doc, C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TOTAL", totalBoxX + 5, y + 20);
    doc.text(`Rs.${invoice.total.toLocaleString("en-IN")}`, W - 15, y + 20, { align: "right" });

    y += 30;

    // ── Payment + Notes (side by side) ────────────────────────────────────────
    const bw = (W - 30) / 2;
    const bh = 30;

    // Payment Box
    setFill(doc, C.gray100);
    setStroke(doc, C.gray200);
    doc.setLineWidth(0.3);
    doc.roundedRect(12, y, bw, bh, 3, 3, "FD");
    y = sectionHeader(doc, "Payment Information", y, W / 2 + 3);
    y += 5;

    const isPaid = invoice.status === "Paid";
    const rows2: [string, string, [number,number,number]][] = [
      ["Status", invoice.status.toUpperCase(), isPaid ? C.green : C.red],
      ["Method", "UPI / Cash / Card", C.text],
    ];
    rows2.forEach(([label, val, color]) => {
      setColor(doc, C.gray400);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(label + ":", 16, y);
      setColor(doc, color);
      doc.setFont("helvetica", "bold");
      doc.text(val, 16 + 22, y);
      y += 7;
    });

    // Notes Box — re-anchor Y to same row
    const notesBoxY = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 34
      : y - 19;

    const nx = W / 2 + 3;
    setFill(doc, C.gray100);
    setStroke(doc, C.gray200);
    doc.setLineWidth(0.3);
    doc.roundedRect(nx, notesBoxY - bh + 5, bw, bh, 3, 3, "FD");
    sectionHeader(doc, "Notes & Terms", notesBoxY - bh + 5, W);

    setColor(doc, C.gray400);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const notes = [
      "Follow-up within 7 days is complimentary.",
      "Retain this invoice for insurance claims.",
      "Queries: care@siaradental.in",
    ];
    notes.forEach((n, i) => {
      doc.text(`• ${n}`, nx + 5, notesBoxY - bh + 18 + i * 6);
    });

    // ── Signature ─────────────────────────────────────────────────────────────
    const sigY = H - 36;
    const sigX = W - 65;
    setStroke(doc, C.dark);
    doc.setLineWidth(0.5);
    doc.line(sigX, sigY, W - 12, sigY);
    setColor(doc, C.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Authorized Signatory", sigX + 26, sigY + 6, { align: "center" });
    setColor(doc, C.gray400);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Dr. Saikiran Reddy  |  BDS, MDS", sigX + 26, sigY + 11, { align: "center" });

    drawFooter(doc, W, H);
    doc.save(`Invoice_${patient.name}_${invoice.id}.pdf`);
  },
};
