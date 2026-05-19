import { sqliteQueue } from '../src/shared/queue/sqliteQueue.service.js';

const r = sqliteQueue.db.prepare("SELECT * FROM queues WHERE action='sendInvoice' ORDER BY created_at DESC LIMIT 1").get();
console.log('ROW:', r);
if (r) console.log('PAYLOAD:', JSON.parse(r.payload));
