import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const SCHEMA = config.NODE_ENV === 'production' ? 'smartcare_prod' : 'smartcare_dev';

class DbService {
  async query(text, params) {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO ${SCHEMA}`);
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  // Optimized read for compatibility - but we should move away from this
  async read() {
    const db = {};
    const tables = [
      'users', 'patients', 'doctors', 'doctor_availability', 'appointments',
      'invoices', 'prescriptions', 'medicines', 'prescription_templates',
      'activity_logs', 'dental_charts', 'queue'
    ];

    // Run queries in parallel for better performance
    const results = await Promise.all(
      tables.map(table => this.query(`SELECT * FROM ${table}`))
    );

    tables.forEach((table, index) => {
      // Map database snake_case to app camelCase where needed
      db[table] = this.mapRows(table, results[index].rows);
    });
    
    return db;
  }

  // Mapping helper to maintain compatibility with the frontend/controllers
  mapRows(table, rows) {
    if (table === 'patients') {
      return rows.map(r => ({
        ...r,
        bloodGroup: r.blood_group,
        registeredOn: r.registered_on ? new Date(r.registered_on).toLocaleDateString('en-CA') : null,
        consultationFee: r.consultation_fee
      }));
    }
    if (table === 'doctor_availability') {
      return rows.map(r => ({
        ...r,
        doctorId: r.doctor_id,
        start: r.start_time,
        end: r.end_time
      }));
    }
    if (table === 'appointments') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        patientName: r.patient_name,
        doctorName: r.doctor_name,
        date: r.date ? new Date(r.date).toLocaleDateString('en-CA') : null
      }));
    }
    if (table === 'invoices') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        date: r.date ? new Date(r.date).toLocaleDateString('en-CA') : null
      }));
    }
    if (table === 'prescriptions') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        doctorName: r.doctor_name,
        date: r.date ? new Date(r.date).toLocaleDateString('en-CA') : null
      }));
    }
    if (table === 'queue') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        patientName: r.patient_name,
        doctorName: r.doctor_name,
        arrivedAt: r.arrived_at
      }));
    }
    if (table === 'dental_charts') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        lastUpdated: r.last_updated
      }));
    }
    if (table === 'activity_logs') {
      return rows.map(r => ({
        ...r,
        userId: r.user_id,
        userName: r.user_name
      }));
    }
    return rows;
  }

  // Placeholder write for compatibility - should be replaced with targeted updates
  async write(db) {
    // This is hard to implement generically and safely for a real DB.
    // We will leave it as a no-op and refactor the controllers to use SQL directly.
    console.warn('dbService.write() called - this is a no-op. Please use targeted SQL updates.');
  }

  async generateId(prefix, existingIds) {
    // existingIds is ignored, we check the DB directly
    let tableName = '';
    switch (prefix) {
      case 'P': tableName = 'patients'; break;
      case 'U': tableName = 'users'; break;
      case 'D': tableName = 'doctors'; break;
      case 'A': tableName = 'appointments'; break;
      case 'INV': tableName = 'invoices'; break;
      case 'PR': tableName = 'prescriptions'; break;
      case 'RX': tableName = 'prescriptions'; break; // Compatibility fallback
      case 'TPL': tableName = 'prescription_templates'; break;
      case 'DIAG': tableName = 'diagnoses'; break;
      case 'TP': tableName = 'treatment_plans'; break;
      case 'Q': tableName = 'queue'; break;
      default: return `${prefix}${Date.now()}`;
    }

    const res = await this.query(`SELECT id FROM ${tableName} WHERE id LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
    if (res.rows.length === 0) return `${prefix}001`;
    
    const lastId = res.rows[0].id;
    const numMatch = lastId.match(/\d+$/);
    const num = numMatch ? parseInt(numMatch[0]) + 1 : 1;
    return `${prefix}${String(num).padStart(3, '0')}`;
  }
}

export const dbService = new DbService();
export { pool };
