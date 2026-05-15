import { dbService } from './src/services/db.service.js';

async function test() {
  try {
    const res = await dbService.query("SELECT id, template_id, medicines, notes FROM prescriptions WHERE id = 'PR010'");
    console.log("DB Result:", res.rows[0]);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

test();
