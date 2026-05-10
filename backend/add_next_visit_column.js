import pg from 'pg';
import { config } from './src/config/env.js';

const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SCHEMA = config.NODE_ENV === 'production' ? 'smartcare_prod' : 'smartcare_dev';

async function migrate() {
  const client = await pool.connect();
  try {
    console.log(`🚀 Adding next_visit_date to prescriptions in ${SCHEMA}...`);
    await client.query(`SET search_path TO ${SCHEMA}`);
    await client.query(`
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS next_visit_date DATE;
    `);
    console.log('✅ Column added successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
