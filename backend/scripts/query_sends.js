import { sqliteQueue } from '../src/shared/queue/sqliteQueue.service.js';

const rows = sqliteQueue.db.prepare("SELECT id,type,action,status,attempts,created_at,run_at,payload,last_error FROM queues WHERE action LIKE 'send%' ORDER BY created_at DESC LIMIT 200").all();
console.log('FOUND', rows.length);
rows.forEach(r=>console.log(r.id,r.type,r.action,r.status,r.attempts,new Date(r.created_at).toISOString(), r.last_error));
