import { dbService } from '../src/core/db/db.service.js';

(async () => {
  const res = await dbService.query("SELECT i.id,i.patient_id,p.phone,p.name FROM invoices i JOIN patients p ON i.patient_id=p.id WHERE i.id='INV033'");
  console.log(res.rows);
})();
