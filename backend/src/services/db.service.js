import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

const SCHEMA = config.NODE_ENV === 'production' ? 'smartcare_prod' : 'smartcare_dev';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  options: `-c search_path=${SCHEMA}`  // set schema at connection level — no per-query overhead
});

class DbService {
  async query(text, params) {
    return pool.query(text, params);  // pool manages client lifecycle safely
  }

  // Optimized read for compatibility - but we should move away from this
  async read() {
    const db = {};
    const tables = [
      'users', 'patients', 'doctors', 'appointments',
      'invoices', 'prescriptions', 'medicines', 'prescription_templates',
      'activity_logs', 'dental_charts', 'treatment_plans', 'diagnoses', 'reports', 'clinical_procedures'
    ];

    // Run queries in parallel for better performance
    const results = await Promise.all(
      tables.map(table => {
        // Exclude deleted items from tables that support soft delete
        const noSoftDelete = ['activity_logs', 'doctors', 'diagnoses', 'reports', 'medicines'];
        const filter = noSoftDelete.includes(table) ? '' : ' WHERE is_deleted = FALSE';
        return this.query(`SELECT * FROM ${table}${filter}`);
      })
    );

    tables.forEach((table, index) => {
      // Map database snake_case to app camelCase where needed
      db[table] = this.mapRows(table, results[index].rows);
    });
    
    return db;
  }

  // Safe JSON parsing helper
  safeJsonParse(data, fallback = []) {
    if (typeof data === 'object' && data !== null) return data;
    if (typeof data !== 'string') return fallback;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('JSON Parse Error:', e.message, 'Data:', data);
      return fallback;
    }
  }

  // Mapping helper to maintain compatibility with the frontend/controllers
  mapRows(table, rows) {
    if (!rows || !Array.isArray(rows)) return [];

    if (table === 'patients') {
      return rows.map(r => ({
        ...r,
        bloodGroup: r.blood_group,
        registeredOn: r.registered_on ? new Date(r.registered_on).toLocaleDateString('en-CA') : null,
        consultationFee: r.consultation_fee,
        chiefComplaint: r.chief_complaint,
        medications: this.safeJsonParse(r.medications, []),
        dentalHistory: this.safeJsonParse(r.dental_history, {})
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
        patientName: r.patient_name,
        patientPhone: r.patient_phone,
        paidAmount: r.paid_amount,
        items: this.safeJsonParse(r.items, []),
        payments: this.safeJsonParse(r.payments, []),
        date: r.date ? new Date(r.date).toLocaleDateString('en-CA') : null
      }));
    }
    if (table === 'prescriptions') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        doctorName: r.doctor_name,
        date: r.date ? new Date(r.date).toLocaleDateString('en-CA') : null,
        chiefComplaint: r.chief_complaint,
        diagnosis: r.diagnosis,
        nextVisitDate: r.next_visit_date ? new Date(r.next_visit_date).toLocaleDateString('en-CA') : null,
        medicines: this.safeJsonParse(r.medicines, []),
        treatmentPlan: this.safeJsonParse(r.treatment_plan, [])
      }));
    }

    if (table === 'dental_charts') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        lastUpdated: r.last_updated,
        chartData: this.safeJsonParse(r.chart_data, {})
      }));
    }
    if (table === 'treatment_plans') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        dentistName: r.dentist_name,
        createdDate: r.created_date ? new Date(r.created_date).toLocaleDateString('en-CA') : null,
        totalCost: Number(r.total_cost) || 0,
        phases: this.safeJsonParse(r.phases, [])
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

  async generateId(prefix, targetTable) {
    let tableName = targetTable;
    
    if (!tableName) {
      switch (prefix) {
        case 'P': tableName = 'patients'; break;
        case 'U': tableName = 'users'; break;
        case 'D': tableName = 'doctors'; break;
        case 'A': tableName = 'appointments'; break;
        case 'INV': tableName = 'invoices'; break;
        case 'PR': tableName = 'prescriptions'; break;
        case 'RX': tableName = 'prescriptions'; break;
        case 'TPL': tableName = 'prescription_templates'; break;
        case 'DIAG': tableName = 'diagnoses'; break;
        case 'TP': tableName = 'treatment_plans'; break;
        case 'EXP': tableName = 'expenses'; break;

        default: return `${prefix}${Date.now()}`;
      }
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
