import { dbService } from './src/services/db.service.js';
import { config } from './src/config/env.js';

async function test() {
  console.log('Testing DB connection...');
  try {
    const res = await dbService.query('SELECT 1');
    console.log('DB connection successful:', res.rows);
  } catch (err) {
    console.error('DB connection failed:', err);
  } finally {
    process.exit(0);
  }
}

test();
