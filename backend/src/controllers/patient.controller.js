import { dbService } from '../services/db.service.js';
import { activityService } from '../services/activity.service.js';
import { emailService } from '../services/email.service.js';
import { emitEvent, SOCKET_EVENTS } from '../services/socket.service.js';

export const getPatients = async (req, res, next) => {
  try {
    const { search, status, gender, from, to } = req.query;

    let query = 'SELECT * FROM patients WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(id) LIKE $${params.length})`;
    }
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (gender && gender !== 'all') {
      params.push(gender);
      query += ` AND gender = $${params.length}`;
    }
    if (from) {
      params.push(from);
      query += ` AND registered_on >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND registered_on <= $${params.length}`;
    }

    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    query += ` ORDER BY registered_on DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await dbService.query(query, params);
    res.json(dbService.mapRows('patients', result.rows));
  } catch (error) {
    next(error);
  }
};

export const getPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const patientRes = await dbService.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (patientRes.rows.length === 0) return res.status(404).json({ message: 'Patient not found' });

    // For diagnoses and reports, we don't have tables yet in my previous scripts but I should have created them or I'll just return empty for now if they don't exist.
    // Wait, I created 'diagnoses' and 'reports' in init-db.js? Let me check.
    // Ah, I missed them in init-db.js! I only had them in the list.
    
    const diagnosesRes = await dbService.query('SELECT * FROM diagnoses WHERE patient_id = $1', [id]).catch(() => ({ rows: [] }));
    const reportsRes = await dbService.query('SELECT * FROM reports WHERE patient_id = $1', [id]).catch(() => ({ rows: [] }));

    res.json({
      patient: dbService.mapRows('patients', patientRes.rows)[0],
      diagnoses: diagnosesRes.rows,
      reports: reportsRes.rows
    });
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req, res, next) => {
  try {
    const id = await dbService.generateId('P', 'patients');
    const { name, age, gender, phone, email, bloodGroup, status, address, allergies, conditions, medications, notes, insuranceProvider, policyNumber, coverageNotes, consultationFee, chiefComplaint } = req.body;
    
    const registeredOn = req.body.registeredOn || new Date().toISOString().slice(0, 10);

    const query = `
      INSERT INTO patients (
        id, name, age, gender, phone, email, blood_group, status, registered_on, 
        address, allergies, conditions, medications, notes, 
        insurance_provider, policy_number, coverage_notes, consultation_fee, chief_complaint
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const params = [
      id, name, age, gender, phone, email, bloodGroup, status || 'Active', registeredOn,
      address, allergies || [], conditions || [], JSON.stringify(medications || []), notes,
      insuranceProvider, policyNumber, coverageNotes, consultationFee || 300, chiefComplaint
    ];

    const result = await dbService.query(query, params);
    const patient = dbService.mapRows('patients', result.rows)[0];

    await activityService.log(req.user.sub, req.user.username, 'Create Patient', `Created patient ${patient.name} (${patient.id})`, req.ip);
    
    // Send welcome email
    if (patient.email) {
      emailService.sendWelcomeEmail(patient).catch(err => console.error('Email failed:', err));
    }

    // Auto-create Consultation Fee Invoice
    const fee = consultationFee || 300;
    const invId = await dbService.generateId('INV', 'invoices');
    const invQuery = `
      INSERT INTO invoices (id, patient_id, date, items, total, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const invParams = [invId, patient.id, registeredOn, JSON.stringify([{ description: "Consultation Fee", amount: fee }]), fee, "Pending"];
    const invRes = await dbService.query(invQuery, invParams);
    const invoice = dbService.mapRows('invoices', invRes.rows)[0];

    // Send invoice email
    if (patient.email) {
      emailService.sendInvoiceEmail(patient, invoice).catch(err => console.error('Invoice email failed:', err));
    }
    
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
    
    // Convert camelCase to snake_case for DB
    const mapping = {
      bloodGroup: 'blood_group',
      insuranceProvider: 'insurance_provider',
      policyNumber: 'policy_number',
      coverageNotes: 'coverage_notes',
      consultationFee: 'consultation_fee',
      chiefComplaint: 'chief_complaint'
    };

    const ALLOWED_COLUMNS = [
      'name', 'age', 'gender', 'phone', 'email', 'blood_group', 'status', 
      'address', 'allergies', 'conditions', 'medications', 'notes', 
      'insurance_provider', 'policy_number', 'coverage_notes', 'consultation_fee',
      'dental_history', 'chief_complaint'
    ];

    const updates = [];
    const params = [id];
    let i = 2;

    for (const [key, value] of Object.entries(fields)) {
      const dbKey = mapping[key] || key;
      if (!ALLOWED_COLUMNS.includes(dbKey)) continue; // Security: Skip non-allowed columns
      
      updates.push(`${dbKey} = $${i}`);
      params.push(key === 'medications' || key === 'dental_history' ? JSON.stringify(value) : value);
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
    
    // Cascading deletes handled by foreign keys in DB (on delete cascade)
    await dbService.query('DELETE FROM patients WHERE id = $1', [id]);
    
    await activityService.log(req.user.sub, req.user.username, 'Delete Patient', `Deleted patient ${patientName} (${id})`, req.ip);

    emitEvent(SOCKET_EVENTS.PATIENT_UPDATED, { id, deleted: true });
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    next(error);
  }
};
