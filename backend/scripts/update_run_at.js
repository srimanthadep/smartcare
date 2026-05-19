import { sqliteQueue } from '../src/shared/queue/sqliteQueue.service.js';
sqliteQueue.db.prepare("UPDATE queues SET run_at = ? WHERE action='sendInvoice'").run(Date.now());
console.log('updated run_at for sendInvoice to now');
