import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    const res = await pool.query('SELECT id, patient_id, is_deleted FROM invoices LIMIT 5');
    console.log('Invoices sample:', res.rows);
    
    const nullCount = await pool.query('SELECT COUNT(*) FROM invoices WHERE is_deleted IS NULL');
    console.log('Invoices with is_deleted IS NULL:', nullCount.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
