import { dbService } from '../../core/db/db.service.js';
import { emitEvent, SOCKET_EVENTS } from '../../shared/sockets/socket.service.js';
import { logActivity, sendEmailJob } from '../../shared/queue/jobQueue.service.js';
import { emailService } from '../../shared/services/email.service.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';

export const getPatients = async (req, res, next) => {
  try {
    const { search, status, gender, from, to } = req.query;

    let query = `
      SELECT p.*, 
             COALESCE(COUNT(DISTINCT a.id), 0) as total_appointments,
             COALESCE(COUNT(DISTINCT i.id), 0) as total_invoices
      FROM patients p
      LEFT JOIN appointments a ON p.id = a.patient_id AND a.is_deleted = FALSE
      LEFT JOIN invoices i ON p.id = i.patient_id AND i.is_deleted = FALSE
      WHERE p.is_deleted = FALSE
    `;
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM patients p
      WHERE p.is_deleted = FALSE
    `;
    
    const params = [];
    const countParams = [];
    let i = 1;

    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      const filter = ` AND (p.name ILIKE $${i} OR p.phone ILIKE $${i} OR p.id ILIKE $${i})`;
      query += filter;
      countQuery += filter;
      i++;
    }

    if (status && status !== 'all') {
      params.push(status);
      countParams.push(status);
      const filter = ` AND p.status = $${i}`;
      query += filter;
      countQuery += filter;
      i++;
    }

    if (gender && gender !== 'all') {
      params.push(gender);
      countParams.push(gender);
      const filter = ` AND p.gender = $${i}`;
      query += filter;
      countQuery += filter;
      i++;
    }

    if (from && to) {
      params.push(from, to);
      countParams.push(from, to);
      const filter = ` AND p.registered_on BETWEEN $${i} AND $${i+1}`;
      query += filter;
      countQuery += filter;
      i += 2;
    }

    // H4: Pagination
    const limit = parseInt(req.query.limit) || 200;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    query += ` GROUP BY p.id`;

    params.push(limit);
    query += ` ORDER BY p.registered_on DESC, p.created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const [result, countResult] = await Promise.all([
      dbService.query(query, params),
      dbService.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0]?.total || 0);

    res.json({
      patients: dbService.mapRows('patients', result.rows),
      total,
      page,
      limit
    });
  } catch (error) {
    next(error);
  }
};

export const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [patientRes, reportsRes] = await Promise.all([
      dbService.query('SELECT * FROM patients WHERE id = $1 AND is_deleted = FALSE', [id]),
      dbService.query('SELECT * FROM reports WHERE patient_id = $1 AND is_deleted = FALSE', [id])
    ]);

    if (patientRes.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patient = dbService.mapRows('patients', patientRes.rows)[0];
    const reports = dbService.mapRows('reports', reportsRes.rows);

    res.json({
      patient,
      diagnoses: [],
      reports
    });
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req, res, next) => {
  try {
    const id = await dbService.generateId('P', 'patients');
    const {
      name, age, gender, phone, email, bloodGroup, status, registeredOn,
      address, allergies, conditions, medications, notes, consultationFee,
      chiefComplaint, dentalHistory
    } = req.body;
    
    const regOn = registeredOn || new Date().toISOString().slice(0, 10);

    const query = `
      INSERT INTO patients (
        id, name, age, gender, phone, email, blood_group, status, registered_on, 
        address, allergies, conditions, medications, notes, 
        consultation_fee, chief_complaint, dental_history
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const params = [
      id, name, age, gender, phone, email, bloodGroup, status || 'Active', regOn,
      address, allergies || [], conditions || [], JSON.stringify(medications || []), notes,
      consultationFee || 300, chiefComplaint, JSON.stringify(dentalHistory || {})
    ];

    const result = await dbService.query(query, params);
    const patient = dbService.mapRows('patients', result.rows)[0];

    // ── Queue background jobs (fire-and-forget) ──
    logActivity({
      userId: req.user.sub, userName: req.user.username,
      action: 'Create Patient', details: `Created patient ${patient.name} (${patient.id})`, ip: req.ip
    });
    
    // Welcome email + WhatsApp
    if (patient.email) {
      sendEmailJob('email-welcome', () => emailService.sendWelcomeEmail(patient));
    }
    whatsappService.sendWelcome(patient);

    // Auto-create Consultation Fee Invoice
    const fee = consultationFee || 300;
    const invId = await dbService.generateId('INV', 'invoices');
    const invQuery = `
      INSERT INTO invoices (id, patient_id, date, items, total, status, paid_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const invParams = [invId, patient.id, regOn, JSON.stringify([{ description: "Consultation Fee", amount: fee }]), fee, "Pending", 0];
    const invRes = await dbService.query(invQuery, invParams);
    const invoice = dbService.mapRows('invoices', invRes.rows)[0];

    // Invoice email + WhatsApp (Disabled: new patient registration only sends welcome message)
    /*
    if (patient.email) {
      sendEmailJob('email-invoice', () => emailService.sendInvoiceEmail(patient, invoice));
    }
    whatsappService.sendInvoice(patient, invoice);
    */
    
    emitEvent(SOCKET_EVENTS.INVOICE_UPDATED, invoice);
    emitEvent(SOCKET_EVENTS.PATIENT_UPDATED, patient);
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    
    // C4: Safe column mapping — only hardcoded strings ever reach SQL
    const COLUMN_MAP = {
      name: 'name', age: 'age', gender: 'gender', phone: 'phone', email: 'email',
      bloodGroup: 'blood_group', blood_group: 'blood_group', status: 'status',
      address: 'address', allergies: 'allergies', conditions: 'conditions',
      medications: 'medications', notes: 'notes',
      consultationFee: 'consultation_fee', consultation_fee: 'consultation_fee',
      dental_history: 'dental_history', dentalHistory: 'dental_history',
      chiefComplaint: 'chief_complaint', chief_complaint: 'chief_complaint',
    };

    const updates = [];
    const params = [id];
    let i = 2;

    for (const [key, value] of Object.entries(fields)) {
      const dbCol = COLUMN_MAP[key];
      if (!dbCol) continue; // Skip unknown fields entirely
      
      updates.push(`${dbCol} = $${i}`);
      params.push(key === 'medications' || key === 'dentalHistory' || key === 'dental_history' ? JSON.stringify(value) : value);
      i++;
    }

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

    const query = `UPDATE patients SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await dbService.query(query, params);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Patient not found' });

    const patient = dbService.mapRows('patients', result.rows)[0];
    emitEvent(SOCKET_EVENTS.PATIENT_UPDATED, patient);
    res.json(patient);
  } catch (error) {
    next(error);
  }
};

export const deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const patientRes = await dbService.query('SELECT name FROM patients WHERE id = $1', [id]);
    if (patientRes.rows.length === 0) return res.status(404).json({ message: 'Patient not found' });

    const patientName = patientRes.rows[0].name;
    
    // Cascading soft deletes for all associated patient data
    // We do this manually because database foreign key 'ON DELETE CASCADE' only works for actual row deletion (hard delete)
    const actorId = req.user?.sub || null;
    await Promise.all([
      dbService.query('UPDATE patients SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2 WHERE id = $1', [id, actorId]),
      dbService.query('UPDATE appointments SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2 WHERE patient_id = $1', [id, actorId]),
      dbService.query('UPDATE invoices SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2 WHERE patient_id = $1', [id, actorId]),
      dbService.query('UPDATE prescriptions SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2 WHERE patient_id = $1', [id, actorId]),
      dbService.query('UPDATE dental_charts SET is_deleted = TRUE WHERE patient_id = $1', [id]),
      dbService.query('UPDATE treatment_plans SET is_deleted = TRUE WHERE patient_id = $1', [id]),
      dbService.query('UPDATE reports SET is_deleted = TRUE WHERE patient_id = $1', [id]),
      dbService.query('UPDATE recalls SET is_deleted = TRUE WHERE patient_id = $1', [id]),
      dbService.query('UPDATE xrays SET is_deleted = TRUE WHERE patient_id = $1', [id])
    ]);
    
    logActivity({
      userId: req.user.sub, userName: req.user.username,
      action: 'Delete Patient', details: `Deleted patient ${patientName} (${id})`, ip: req.ip
    });

    emitEvent(SOCKET_EVENTS.PATIENT_UPDATED, { id, deleted: true });
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    next(error);
  }
};
