import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Patient, Prescription } from "@/types";
import logo from "@/assets/logo.png";

const CLINIC_NAME = "Siara Dental Clinic";
const CLINIC_ADDRESS = "123 Dental Street, Healthcare City";
const CLINIC_PHONE = "+91 98765 43210";
const CLINIC_EMAIL = "contact@siaradental.com";

export const pdfService = {
  async generatePrescriptionPDF(patient: Patient, prescription: Prescription) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    try {
      doc.addImage(logo, "PNG", 15, 15, 30, 30);
    } catch (e) {
      console.warn("Logo failed to load in PDF", e);
    }

    doc.setFontSize(22);
    doc.setTextColor(0, 112, 243); // #0070f3
    doc.text(CLINIC_NAME, 50, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(CLINIC_ADDRESS, 50, 32);
    doc.text(`Phone: ${CLINIC_PHONE} | Email: ${CLINIC_EMAIL}`, 50, 37);

    doc.setDrawColor(0, 112, 243);
    doc.setLineWidth(0.5);
    doc.line(15, 48, pageWidth - 15, 48);

    // Document Title
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text("PRESCRIPTION", pageWidth / 2, 60, { align: "center" });

    // Patient Info Box
    doc.setFillColor(245, 247, 250);
    doc.rect(15, 68, pageWidth - 30, 25, "F");
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("PATIENT DETAILS", 20, 75);
    
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Name: ${patient.name}`, 20, 82);
    doc.text(`Age/Sex: ${patient.age}Y / ${patient.gender}`, 20, 88);
    
    doc.text(`ID: ${patient.id}`, pageWidth - 60, 82);
    doc.text(`Date: ${prescription.date}`, pageWidth - 60, 88);

    // Chief Complaint & Diagnosis
    let currentY = 105;
    
    if (prescription.chiefComplaint) {
      doc.setFontSize(10);
      doc.setTextColor(150, 0, 0); // Reddish for importance
      doc.text("1. CHIEF COMPLAINT", 15, currentY);
      doc.setTextColor(0);
      doc.setFontSize(11);
      const splitCC = doc.splitTextToSize(prescription.chiefComplaint, pageWidth - 30);
      doc.text(splitCC, 15, currentY + 7);
      currentY += (splitCC.length * 5) + 12;
    }

    if (prescription.diagnosis) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("2. DIAGNOSIS", 15, currentY);
      doc.setTextColor(0);
      doc.setFontSize(11);
      const splitDiag = doc.splitTextToSize(prescription.diagnosis, pageWidth - 30);
      doc.text(splitDiag, 15, currentY + 7);
      currentY += (splitDiag.length * 5) + 12;
    }

    // Rx Section
    doc.setFontSize(16);
    doc.setTextColor(0, 112, 243);
    doc.text("3. Rx (Medicines)", 15, currentY);

    // Medicines Table
    const tableData = prescription.medicines.map((m, i) => [
      i + 1,
      m.name,
      m.dosage,
      m.frequency,
      m.duration
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [["#", "Medicine Name", "Dosage", "Frequency", "Duration"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [0, 112, 243], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: "auto", fontStyle: "bold" }
      }
    });

    // Notes
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    if (prescription.notes) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Clinical Notes / Advice:", 15, finalY + 15);
      doc.setFontSize(10);
      doc.setTextColor(100);
      const splitNotes = doc.splitTextToSize(prescription.notes, pageWidth - 30);
      doc.text(splitNotes, 15, finalY + 22);
    }

    if (prescription.nextVisitDate) {
      const followUpY = prescription.notes ? (finalY + 35) : (finalY + 15);
      doc.setFontSize(12);
      doc.setTextColor(200, 150, 0); // Amber-ish
      doc.text("Recommended Next Visit:", 15, followUpY);
      doc.setFontSize(14);
      doc.setTextColor(0);
      const nextDate = new Date(prescription.nextVisitDate).toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      doc.text(nextDate, 15, followUpY + 8);
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(200);
    doc.line(15, footerY, pageWidth - 15, footerY);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Authorized Signatory", pageWidth - 50, footerY + 15);
    doc.text(prescription.doctorName || "Dr. Saikiran", pageWidth - 50, footerY + 20);

    doc.save(`Prescription_${patient.name}_${prescription.id}.pdf`);
  },

  async generateInvoicePDF(patient: Patient, invoice: Invoice) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    try {
      doc.addImage(logo, "PNG", 15, 15, 30, 30);
    } catch (e) {
      console.warn("Logo failed to load in PDF", e);
    }

    doc.setFontSize(22);
    doc.setTextColor(0, 112, 243);
    doc.text(CLINIC_NAME, 50, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(CLINIC_ADDRESS, 50, 32);
    doc.text(`Phone: ${CLINIC_PHONE} | Email: ${CLINIC_EMAIL}`, 50, 37);

    doc.setDrawColor(0, 112, 243);
    doc.setLineWidth(0.5);
    doc.line(15, 48, pageWidth - 15, 48);

    // Invoice Meta
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text("INVOICE", 15, 60);
    
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.id}`, pageWidth - 15, 60, { align: "right" });
    doc.text(`Date: ${invoice.date}`, pageWidth - 15, 65, { align: "right" });
    doc.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - 15, 70, { align: "right" });

    // Billing Info
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("BILL TO", 15, 80);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(patient.name, 15, 87);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(patient.phone, 15, 93);
    if (patient.address) {
      const splitAddr = doc.splitTextToSize(patient.address, 60);
      doc.text(splitAddr, 15, 98);
    }

    // Items Table
    const tableData = invoice.items.map((item, i) => [
      i + 1,
      item.description + (item.toothNumber ? ` (Tooth #${item.toothNumber})` : ""),
      `₹${item.amount.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 115,
      head: [["#", "Service Description", "Amount"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [0, 112, 243], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { cellWidth: 40, halign: "right" }
      }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Total Amount:", pageWidth - 80, finalY + 15);
    doc.setTextColor(0, 112, 243);
    doc.setFontSize(16);
    doc.text(`₹${invoice.total.toLocaleString()}`, pageWidth - 15, finalY + 15, { align: "right" });

    // Payment Status Box
    if (invoice.status === "Paid") {
      doc.setDrawColor(46, 133, 90); // green
      doc.setFillColor(230, 255, 250);
      doc.roundedRect(15, finalY + 25, pageWidth - 30, 15, 3, 3, "FD");
      doc.setTextColor(46, 133, 90);
      doc.setFontSize(12);
      doc.text("PAID IN FULL", pageWidth / 2, finalY + 34, { align: "center" });
    } else {
      doc.setDrawColor(197, 48, 48); // red
      doc.setFillColor(255, 245, 245);
      doc.roundedRect(15, finalY + 25, pageWidth - 30, 15, 3, 3, "FD");
      doc.setTextColor(197, 48, 48);
      doc.setFontSize(12);
      doc.text("PAYMENT PENDING", pageWidth / 2, finalY + 34, { align: "center" });
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Thank you for your trust in our clinical services.", pageWidth / 2, footerY, { align: "center" });
    doc.text("This is a computer generated invoice.", pageWidth / 2, footerY + 5, { align: "center" });

    doc.save(`Invoice_${patient.name}_${invoice.id}.pdf`);
  }
};
