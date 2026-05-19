import { dbService } from '../src/core/db/db.service.js';
import { whatsappService } from '../src/modules/whatsapp/whatsapp.service.js';
import { sqliteQueue } from '../src/shared/queue/sqliteQueue.service.js';

(async () => {
  const res = await dbService.query("SELECT i.*, p.name as patientName, p.phone as patientPhone, p.age, p.gender FROM invoices i JOIN patients p ON i.patient_id = p.id WHERE i.id = 'INV033'");
  if (!res || res.rows.length === 0) { console.error('Invoice not found'); process.exit(1); }
  const invoice = dbService.mapRows('invoices', res.rows)[0];
  console.log('raw rows:', res.rows);
  const phone = invoice.patientphone || invoice.patientPhone || invoice.patient_phone || invoice.patientPhoneNumber || invoice.patientPhoneNumber;
  const patient = { id: invoice.patientId || invoice.patient_id, name: invoice.patientName || invoice.patientname, phone, age: invoice.age, gender: invoice.gender };
  console.log('Invoice object keys:', Object.keys(invoice));
  console.log('Calling sendInvoice for', invoice.id, 'patient', patient.phone);
  await whatsappService.sendInvoice(patient, invoice);
  const rows = sqliteQueue.db.prepare("SELECT id,type,action,status,payload,created_at FROM queues ORDER BY created_at DESC LIMIT 10").all();
  console.log('QUEUE_AFTER:', rows.length);
  rows.forEach(r=>console.log(r.id, r.type, r.action, r.status, new Date(r.created_at).toISOString(), r.payload));
})();
