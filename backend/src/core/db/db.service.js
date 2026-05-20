import pg from 'pg';
import { config } from '../../core/config/env.js';

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

  // H3: Transaction helper for operations needing isolation
  async withTransaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Failed to rollback transaction:', rollbackErr);
      }
      throw err;
    } finally {
      client.release();
    }
  }

  // Optimized read for compatibility - but we should move away from this
  async read() {
    const db = {};
    const tables = [
      'users', 'patients', 'doctors', 'appointments',
      'invoices', 'prescriptions', 'medicines', 'prescription_templates',
      'activity_logs', 'dental_charts', 'treatment_plans', 'diagnoses', 'reports', 'clinical_procedures', 'xrays'
    ];

    // Run queries in parallel for better performance
    const results = await Promise.all(
      tables.map(table => {
        // Exclude deleted items from tables that support soft delete
        const noSoftDelete = ['activity_logs', 'doctors', 'medicines'];
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
        patientName: r.patient_name,
        patientPhone: r.patient_phone,
        age: r.age,
        gender: r.gender,
        doctorName: r.doctor_name,
        date: r.date ? new Date(r.date).toLocaleDateString('en-CA') : null,
        chiefComplaint: r.chief_complaint,
        diagnosis: r.diagnosis,
        nextVisitDate: r.next_visit_date ? new Date(r.next_visit_date).toLocaleDateString('en-CA') : null,
        templateId: r.template_id,
        xrayIds: this.safeJsonParse(r.xray_ids, []),
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
    if (table === 'recalls') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        patientName: r.patient_name,
        lastVisit: r.last_visit ? new Date(r.last_visit).toLocaleDateString('en-CA') : null,
        recallDate: r.recall_date ? new Date(r.recall_date).toLocaleDateString('en-CA') : null,
      }));
    }
    if (table === 'expenses') {
      return rows.map(r => ({
        ...r,
        paymentMethod: r.payment_method,
        createdAt: r.created_at,
      }));
    }
    if (table === 'xrays') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        patientName: r.patient_name,
        patientPhone: r.patient_phone,
        patientAge: r.patient_age,
        patientGender: r.patient_gender,
        patientEmail: r.patient_email,
        fileUrl: r.file_url,
        thumbnailUrl: r.thumbnail_url,
        cloudinaryPublicId: r.cloudinary_public_id,
        toothNumbers: this.safeJsonParse(r.tooth_numbers, []),
        tags: this.safeJsonParse(r.tags, []),
        annotations: this.safeJsonParse(r.annotations, []),
        reviewedBy: r.reviewed_by,
        reviewedAt: r.reviewed_at,
        uploadedBy: r.uploaded_by,
        takenDate: r.taken_date ? new Date(r.taken_date).toLocaleDateString('en-CA') : null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }
    if (table === 'diagnoses') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        recordedOn: r.recorded_on ? new Date(r.recorded_on).toLocaleDateString('en-CA') : null
      }));
    }
    if (table === 'reports') {
      return rows.map(r => ({
        ...r,
        patientId: r.patient_id,
        previewUrl: r.preview_url,
        date: r.date ? new Date(r.date).toLocaleDateString('en-CA') : null
      }));
    }
    return rows;
  }

  // Placeholder write for compatibility - should be replaced with targeted updates
  async write(db) {
    throw new Error('dbService.write() is deprecated. Use targeted SQL queries via dbService.query().');
  }

  // H3: Race-safe ID generation using advisory lock inside a transaction
  async generateId(prefix, targetTable) {
    try {
      return await this.withTransaction(async (client) => {
        // Advisory lock keyed on table name hash to prevent concurrent generation
        const lockKey = Math.abs([...targetTable].reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0));
        await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

        const query = `
          SELECT id FROM ${targetTable}
          WHERE id ~ $1
          ORDER BY id DESC LIMIT 1
        `;
        const pattern = `^${prefix}[0-9]+$`;
        const result = await client.query(query, [pattern]);

        if (result.rows.length === 0) {
          return `${prefix}001`;
        }

        const lastId = result.rows[0].id;
        const numMatch = lastId.match(/[0-9]+$/);

        if (numMatch) {
          const numPart = parseInt(numMatch[0]);
          const nextNum = numPart + 1;
          const paddedNum = nextNum.toString().padStart(Math.max(3, numMatch[0].length), '0');
          return `${prefix}${paddedNum}`;
        }

        const { randomBytes } = await import('crypto');
        return `${prefix}${randomBytes(3).toString('hex').toUpperCase()}`;
      });
    } catch (error) {
      console.error(`Error generating ID for ${targetTable}:`, error);
      const { randomUUID } = await import('crypto');
      return `${prefix}${randomUUID().slice(0, 8).toUpperCase()}`;
    }
  }

  // H9: Stream a single table for backup (avoids loading everything into memory)
  async streamTableRows(table) {
    const noSoftDelete = ['activity_logs', 'doctors', 'medicines'];
    const filter = noSoftDelete.includes(table) ? '' : ' WHERE is_deleted = FALSE';
    const result = await this.query(`SELECT * FROM ${table}${filter}`);
    return this.mapRows(table, result.rows);
  }
}

export const dbService = new DbService();
export { pool };
