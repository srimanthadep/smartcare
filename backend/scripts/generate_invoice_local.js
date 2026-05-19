import fs from 'fs';
import { pdfService } from '../src/shared/services/pdf.service.js';

(async () => {
  try {
    const { dbService } = await import('../src/core/db/db.service.js');
    const res = await dbService.query(`SELECT i.*, p.name as patient_name, p.phone as patient_phone, p.age, p.gender FROM invoices i JOIN patients p ON i.patient_id = p.id WHERE i.is_deleted = FALSE ORDER BY i.date DESC LIMIT 1`);
    if (!res || res.rows.length === 0) {
      console.error('No invoice rows found');
      process.exit(1);
    }
    const invoice = dbService.mapRows('invoices', res.rows)[0];
    console.log('SELECTED_INVOICE_ID:', invoice.id);
    const patient = {
      id: invoice.patientId,
      name: invoice.patientName,
      phone: invoice.patientPhone,
      age: invoice.age,
      gender: invoice.gender
    };
    const buf = await pdfService.generateInvoicePDF(patient, invoice);
    const out = 'invoice_local.pdf';
    fs.writeFileSync(out, buf);
    console.log('WROTE', out, buf.length, 'bytes');
  } catch (e) {
    console.error('Error generating local PDF:', e && e.message);
    process.exit(1);
  }
})();
