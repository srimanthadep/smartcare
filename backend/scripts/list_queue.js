import { sqliteQueue } from '../src/shared/queue/sqliteQueue.service.js';

const stats = sqliteQueue.db.prepare("SELECT status, COUNT(*) as cnt FROM queues GROUP BY status").all();
console.log('QUEUE STATS:');
stats.forEach(s => console.log(s.status, s.cnt));

const recent = sqliteQueue.db.prepare("SELECT id,type,action,status,attempts,created_at,run_at,payload,last_error FROM queues ORDER BY created_at DESC LIMIT 50").all();
console.log('RECENT ROWS:', recent.length);
recent.forEach(r=>{
  console.log(r.id, r.type, r.action, r.status, 'attempts', r.attempts, 'run_at', new Date(r.run_at||0).toISOString(), 'last_error', r.last_error);
});
