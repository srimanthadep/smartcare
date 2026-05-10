import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const getLogoBase64 = async (): Promise<string | null> => {
  try {
    const { default: logoUrl } = await import('@/assets/logo.png');
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl;
    });
  } catch (err) {
    return null;
  }
};

const drawPatientRecord = (
  doc: jsPDF,
  logoBase64: string | null,
  patient: any,
  dentalChart: any[],
  invoices: any[],
  prescriptions: any[],
  diagnoses: any[],
  startY: number = 40
) => {
  const pageWidth = doc.internal.pageSize.width;
  let yPos = startY;

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 40, yPos - 15, 45, 45);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Siara Dental", 95, yPos + 5);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Comprehensive Medical Record Release", 95, yPos + 20);
  } else {
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Siara Dental", 40, yPos + 5);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Comprehensive Medical Record Release", 40, yPos + 20);
  }
  
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 40, yPos + 20, { align: "right" });
  
  yPos += 45;
  doc.setDrawColor(226, 232, 240);
  doc.line(40, yPos, pageWidth - 40, yPos);
  yPos += 25;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Patient Demographics", 40, yPos);
  yPos += 15;

  autoTable(doc, {
    startY: yPos,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 2: { fontStyle: 'bold', cellWidth: 100 } },
    body: [
      ["Name:", patient.name, "Patient ID:", patient.id],
      ["Age/Gender:", `${patient.age} / ${patient.gender}`, "Blood Group:", patient.bloodGroup],
      ["Phone:", patient.phone, "Email:", patient.email || "N/A"],
      ["Registered:", patient.registeredOn, "Status:", patient.status],
    ],
  });
  yPos = (doc as any).lastAutoTable.finalY + 25;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Medical History & Allergies", 40, yPos);
  yPos += 15;

  autoTable(doc, {
    startY: yPos,
    head: [['Conditions', 'Allergies', 'Active Medications']],
    body: [
      [
        patient.conditions?.join(", ") || "None recorded",
        patient.allergies?.join(", ") || "None recorded",
        patient.medications?.map((m: any) => `${m.name} (${m.dosage})`).join(", ") || "None recorded"
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    styles: { fontSize: 9 }
  });
  yPos = (doc as any).lastAutoTable.finalY + 25;

  if (diagnoses && diagnoses.length > 0) {
    if (yPos > doc.internal.pageSize.height - 100) { doc.addPage(); yPos = 40; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Diagnoses", 40, yPos);
    yPos += 15;

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Diagnosis', 'ICD-10', 'Status', 'Notes']],
      body: diagnoses.map((d:any) => [d.recordedOn, d.name, d.icd10 || "-", d.status, d.notes || "-"]),
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      styles: { fontSize: 9 }
    });
    yPos = (doc as any).lastAutoTable.finalY + 25;
  }

  if (dentalChart && dentalChart.length > 0) {
    if (yPos > doc.internal.pageSize.height - 100) { doc.addPage(); yPos = 40; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Dental Chart", 40, yPos);
    yPos += 15;

    autoTable(doc, {
      startY: yPos,
      head: [['Tooth', 'Condition', 'Notes']],
      body: dentalChart.map((t:any) => [t.toothNumber, t.condition, t.notes || "-"]),
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      styles: { fontSize: 9 }
    });
    yPos = (doc as any).lastAutoTable.finalY + 25;
  }

  if (prescriptions && prescriptions.length > 0) {
    if (yPos > doc.internal.pageSize.height - 100) { doc.addPage(); yPos = 40; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Prescriptions History", 40, yPos);
    yPos += 15;

    const pxRows: any[] = [];
    prescriptions.forEach((px:any) => {
       px.medicines?.forEach((m: any) => {
           pxRows.push([
               new Date(px.date).toLocaleDateString(),
               px.doctorName,
               m.name,
               `${m.dosage} - ${m.frequency}`,
               m.duration
           ]);
       });
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Doctor', 'Medicine', 'Dosage/Freq', 'Duration']],
      body: pxRows,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      styles: { fontSize: 9 }
    });
    yPos = (doc as any).lastAutoTable.finalY + 25;
  }

  if (invoices && invoices.length > 0) {
    if (yPos > doc.internal.pageSize.height - 100) { doc.addPage(); yPos = 40; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Billing History", 40, yPos);
    yPos += 15;

    autoTable(doc, {
      startY: yPos,
      head: [['Invoice ID', 'Date', 'Status', 'Total (INR)']],
      body: invoices.map((inv:any) => [inv.id, inv.date, inv.status, `Rs. ${inv.total.toLocaleString()}`]),
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      styles: { fontSize: 9 }
    });
    yPos = (doc as any).lastAutoTable.finalY + 25;
  }
};

/**
 * Service to export comprehensive patient data to professional PDF and XLSX formats.
 */
export const exportService = {
  
  /**
   * Generates a multi-sheet Excel workbook containing all patient records.
   * This is ideal for robust data backup and re-importation.
   */
  exportPatientToExcel: (
    patient: any, 
    dentalChart: any[] = [], 
    invoices: any[] = [], 
    prescriptions: any[] = [], 
    diagnoses: any[] = []
  ) => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Demographics Sheet
      const demographicsData = [
        {
          Patient_ID: patient.id,
          Name: patient.name,
          Age: patient.age,
          Gender: patient.gender,
          Blood_Group: patient.bloodGroup,
          Phone: patient.phone,
          Email: patient.email,
          Address: patient.address,
          Status: patient.status,
          Registered_On: patient.registeredOn,
          Clinical_Notes: patient.notes || ""
        }
      ];
      const wsDemographics = XLSX.utils.json_to_sheet(demographicsData);
      XLSX.utils.book_append_sheet(wb, wsDemographics, "Demographics");

      // 2. Medical History Sheet
      const historyData = [];
      const maxLen = Math.max(
        patient.conditions?.length || 0, 
        patient.allergies?.length || 0, 
        patient.medications?.length || 0
      );
      
      for(let i = 0; i < maxLen; i++) {
        historyData.push({
          Condition: patient.conditions?.[i] || "",
          Allergy: patient.allergies?.[i] || "",
          Medication_Name: patient.medications?.[i]?.name || "",
          Medication_Dosage: patient.medications?.[i]?.dosage || "",
          Medication_Freq: patient.medications?.[i]?.frequency || "",
        });
      }
      
      if (historyData.length === 0) {
        historyData.push({ Condition: "None", Allergy: "None", Medication_Name: "None" });
      }
      
      const wsHistory = XLSX.utils.json_to_sheet(historyData);
      XLSX.utils.book_append_sheet(wb, wsHistory, "Medical_History");

      // 3. Dental Chart Sheet
      const chartData = dentalChart.map(t => ({
        Tooth_Number: t.toothNumber,
        Condition: t.condition,
        Notes: t.notes || ""
      }));
      const wsChart = XLSX.utils.json_to_sheet(chartData.length ? chartData : [{ Tooth_Number: "No records", Condition: "", Notes: "" }]);
      XLSX.utils.book_append_sheet(wb, wsChart, "Dental_Chart");

      // 4. Diagnoses Sheet
      const diagData = diagnoses.map(d => ({
        Diagnosis_ID: d.id,
        Name: d.name,
        ICD10: d.icd10 || "",
        Status: d.status,
        Recorded_On: d.recordedOn,
        Notes: d.notes || ""
      }));
      const wsDiag = XLSX.utils.json_to_sheet(diagData.length ? diagData : [{ Diagnosis_ID: "No diagnoses", Name: "", Status: "" }]);
      XLSX.utils.book_append_sheet(wb, wsDiag, "Diagnoses");

      // 5. Prescriptions Sheet
      // Flatten prescriptions to one row per medicine for proper relational export
      const pxData: any[] = [];
      if (prescriptions.length === 0) {
          pxData.push({ Prescription_ID: "No records" });
      } else {
          prescriptions.forEach(px => {
            if (px.medicines && px.medicines.length > 0) {
                px.medicines.forEach((med: any) => {
                    pxData.push({
                        Prescription_ID: px.id,
                        Date: new Date(px.date).toLocaleDateString(),
                        Doctor: px.doctorName,
                        Medicine: med.name,
                        Dosage: med.dosage,
                        Frequency: med.frequency,
                        Duration: med.duration,
                        Instructions: med.instructions || ""
                    });
                });
            } else {
                pxData.push({
                    Prescription_ID: px.id,
                    Date: new Date(px.date).toLocaleDateString(),
                    Doctor: px.doctorName,
                    Medicine: "No medicines listed"
                });
            }
          });
      }
      const wsPx = XLSX.utils.json_to_sheet(pxData);
      XLSX.utils.book_append_sheet(wb, wsPx, "Prescriptions");

      // 6. Invoices Sheet
      const invData = invoices.map(i => ({
        Invoice_ID: i.id,
        Date: i.date,
        Total_Amount_INR: i.total,
        Status: i.status
      }));
      const wsInv = XLSX.utils.json_to_sheet(invData.length ? invData : [{ Invoice_ID: "No invoices", Date: "", Total_Amount_INR: 0, Status: "" }]);
      XLSX.utils.book_append_sheet(wb, wsInv, "Invoices");

      // Export file
      const fileName = `${patient.name.replace(/\s+/g, '_')}_Full_Record_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      return true;
    } catch (error) {
      console.error("Error generating Excel export:", error);
      throw new Error("Failed to generate Excel export.");
    }
  },

  /**
   * Generates a professional, chronological PDF report of the patient's record.
   */
  exportPatientToPDF: async (
    patient: any, 
    dentalChart: any[] = [], 
    invoices: any[] = [], 
    prescriptions: any[] = [], 
    diagnoses: any[] = []
  ) => {
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      const logoBase64 = await getLogoBase64();
      
      drawPatientRecord(doc, logoBase64, patient, dentalChart, invoices, prescriptions, diagnoses);

      const pageWidth = doc.internal.pageSize.width;
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${i} of ${pageCount} | CONFIDENTIAL MEDICAL RECORD`,
          pageWidth / 2,
          doc.internal.pageSize.height - 20,
          { align: 'center' }
        );
      }

      const fileName = `${patient.name.replace(/\s+/g, '_')}_Clinical_Report_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
      return true;
    } catch (error) {
      console.error("Error generating PDF export:", error);
      throw new Error("Failed to generate PDF export.");
    }
  },

  /**
   * Bulk Export functions for Patient Directory
   */
  exportAllPatientsToExcel: (bulkData: any[]) => {
    try {
      const wb = XLSX.utils.book_new();

      const demographicsData: any[] = [];
      const historyData: any[] = [];
      const chartData: any[] = [];
      const diagData: any[] = [];
      const pxData: any[] = [];
      const invData: any[] = [];

      bulkData.forEach(item => {
        const { patient, diagnoses, dentalChart, invoices, prescriptions } = item;
        
        // Demographics
        demographicsData.push({
          Patient_ID: patient.id,
          Name: patient.name,
          Age: patient.age,
          Gender: patient.gender,
          Blood_Group: patient.bloodGroup,
          Phone: patient.phone,
          Email: patient.email || "N/A",
          Registered_On: patient.registeredOn,
          Status: patient.status
        });

        // History
        const maxLen = Math.max(patient.conditions?.length || 0, patient.allergies?.length || 0, patient.medications?.length || 0);
        if (maxLen === 0) {
          historyData.push({ Patient_ID: patient.id, Patient_Name: patient.name, Condition: "None", Allergy: "None", Medication: "None" });
        }
        for(let i = 0; i < maxLen; i++) {
          historyData.push({
            Patient_ID: patient.id,
            Patient_Name: patient.name,
            Condition: patient.conditions?.[i] || "",
            Allergy: patient.allergies?.[i] || "",
            Medication: patient.medications?.[i] ? `${patient.medications[i].name} (${patient.medications[i].dosage})` : ""
          });
        }

        // Dental Chart
        dentalChart.forEach((t:any) => {
          chartData.push({
            Patient_ID: patient.id, Patient_Name: patient.name, Tooth_Number: t.toothNumber, Condition: t.condition, Notes: t.notes || ""
          });
        });

        // Diagnoses
        diagnoses.forEach((d:any) => {
          diagData.push({
            Patient_ID: patient.id, Patient_Name: patient.name, Diagnosis_ID: d.id, Name: d.name, ICD10: d.icd10 || "", Status: d.status, Recorded_On: d.recordedOn
          });
        });

        // Prescriptions
        prescriptions.forEach((px:any) => {
          if (px.medicines && px.medicines.length > 0) {
              px.medicines.forEach((med: any) => {
                  pxData.push({
                      Patient_ID: patient.id, Patient_Name: patient.name, Prescription_ID: px.id, Date: new Date(px.date).toLocaleDateString(), Doctor: px.doctorName, Medicine: med.name, Dosage: med.dosage, Frequency: med.frequency, Duration: med.duration
                  });
              });
          }
        });

        // Invoices
        invoices.forEach((i:any) => {
          invData.push({
            Patient_ID: patient.id, Patient_Name: patient.name, Invoice_ID: i.id, Date: i.date, Total_Amount_INR: i.total, Status: i.status
          });
        });
      });
      
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(demographicsData.length ? demographicsData : [{ Data: "No data" }]), "Demographics");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyData.length ? historyData : [{ Data: "No data" }]), "Medical_History");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chartData.length ? chartData : [{ Data: "No data" }]), "Dental_Charts");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(diagData.length ? diagData : [{ Data: "No data" }]), "Diagnoses");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pxData.length ? pxData : [{ Data: "No data" }]), "Prescriptions");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invData.length ? invData : [{ Data: "No data" }]), "Invoices");

      const fileName = `Siara_Dental_All_Patients_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      return true;
    } catch (error) {
      console.error("Error generating bulk Excel export:", error);
      throw new Error("Failed to generate bulk Excel export.");
    }
  },

  exportAllPatientsToPDF: async (bulkData: any[]) => {
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      const logoBase64 = await getLogoBase64();

      for (let i = 0; i < bulkData.length; i++) {
        if (i > 0) doc.addPage();
        const { patient, dentalChart, invoices, prescriptions, diagnoses } = bulkData[i];
        drawPatientRecord(doc, logoBase64, patient, dentalChart, invoices, prescriptions, diagnoses);
      }

      const pageWidth = doc.internal.pageSize.width;
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${i} of ${pageCount} | CONFIDENTIAL MEDICAL RECORD BATCH`,
          pageWidth / 2,
          doc.internal.pageSize.height - 20,
          { align: 'center' }
        );
      }

      const fileName = `Siara_Dental_All_Patients_Batch_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
      return true;
    } catch (error) {
      console.error("Error generating bulk PDF export:", error);
      throw new Error("Failed to generate bulk PDF export.");
    }
  }
};
