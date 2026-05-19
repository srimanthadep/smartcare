import { whatsappService } from '../src/modules/whatsapp/whatsapp.service.js';
import { sqliteQueue } from '../src/shared/queue/sqliteQueue.service.js';

(async ()=>{
  const patient = { id: 'P_TEST', name: 'Test User', phone: '9912345678' };
  const invoice = { id: 'INV_TEST', total: 1234 };
  await whatsappService.sendInvoice(patient, invoice);
  const rows = sqliteQueue.db.prepare("SELECT id,type,action,status,payload FROM queues ORDER BY created_at DESC LIMIT 10").all();
  console.log('QUEUE_AFTER:', rows.length);
  rows.forEach(r=>console.log(r.id, r.type, r.action, r.status, r.payload));
})();
