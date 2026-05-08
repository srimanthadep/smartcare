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
    console.log(`🚀 Starting migrations for ${SCHEMA}...`);
    
    // Create schema if not exists
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    await client.query(`SET search_path TO ${SCHEMA}`);

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(20) NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INTEGER,
        gender VARCHAR(10),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        blood_group VARCHAR(5),
        allergies JSONB DEFAULT '[]',
        conditions JSONB DEFAULT '[]',
        medications JSONB DEFAULT '[]',
        registered_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_visit TIMESTAMP WITH TIME ZONE,
        consultation_fee DECIMAL(10,2) DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS prescription_templates (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        medicines JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS prescriptions (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) REFERENCES patients(id),
        patient_name VARCHAR(100),
        doctor_name VARCHAR(100),
        date DATE,
        medicines JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) REFERENCES patients(id),
        patient_name VARCHAR(100),
        amount DECIMAL(10,2),
        status VARCHAR(20),
        date DATE,
        items JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) REFERENCES patients(id),
        patient_name VARCHAR(100),
        doctor_name VARCHAR(100),
        date DATE,
        time VARCHAR(20),
        type VARCHAR(50),
        status VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
