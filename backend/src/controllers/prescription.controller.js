import { dbService } from '../services/db.service.js';
import { activityService } from '../services/activity.service.js';
import { emailService } from '../services/email.service.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { emitEvent, SOCKET_EVENTS } from '../services/socket.service.js';

export const getPrescriptions = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    let query = 'SELECT * FROM prescriptions';
    const params = [];

    if (patientId) {
      params.push(patientId);
      query += ' WHERE patient_id = $1';
    }
    query += ' ORDER BY date DESC';

    const result = await dbService.query(query, params);
    res.json(dbService.mapRows('prescriptions', result.rows));
  } catch (error) {
    next(error);
  }
};

const saveMedicines = async (medicines) => {
  if (!medicines || !Array.isArray(medicines)) return;
  for (const med of medicines) {
    if (!med.name) continue;
    try {
      await dbService.query(`
        INSERT INTO saved_medicines (name, dose, frequency, duration, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (name) DO UPDATE SET
          dose = EXCLUDED.dose,
          frequency = EXCLUDED.frequency,
          duration = EXCLUDED.duration,
          updated_at = CURRENT_TIMESTAMP
      `, [med.name, med.dosage || '', med.frequency || '', med.duration || '']);
    } catch (err) {
      console.error('Error saving medicine:', err);
    }
  }
};

export const createPrescription = async (req, res, next) => {
  try {
    const id = await dbService.generateId('PR', 'prescriptions');
    const { patientId, patientName, doctorName, date, medicines, notes, chiefComplaint, diagnosis, nextVisitDate } = req.body;
    const pxDate = date || new Date().toISOString().slice(0, 10);

    const query = `
      INSERT INTO prescriptions (id, patient_id, doctor_name, date, medicines, notes, chief_complaint, diagnosis, next_visit_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const params = [id, patientId, doctorName, pxDate, JSON.stringify(medicines), notes, chiefComplaint, diagnosis, nextVisitDate];
    const result = await dbService.query(query, params);
    const prescription = dbService.mapRows('prescriptions', result.rows)[0];

    await activityService.log(req.user.sub, req.user.username, 'Create Prescription', `Created prescription for patient ${patientName}`, req.ip);
    
    // Send prescription email
    const patientRes = await dbService.query('SELECT * FROM patients WHERE id = $1', [patientId]);
    const patient = dbService.mapRows('patients', patientRes.rows)[0];

    if (patient && patient.email) {
      emailService.sendPrescriptionEmail(patient, prescription).catch(err => console.error('Email error:', err));
    }
    // Also send via WhatsApp (silent skip if disconnected)
    if (patient) {
      whatsappService.sendPrescription(patient, prescription)
        .catch(err => console.error('WA Rx failed:', err));
    }
    
    // Save medicines for future recommendations
    await saveMedicines(medicines);

    emitEvent(SOCKET_EVENTS.PRESCRIPTION_UPDATED, prescription);
    res.status(201).json(prescription);
  } catch (error) {
    next(error);
  }
};

export const updatePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const updates = [];
    const params = [id];
    let i = 2;

    const mapping = {
      patientId: 'patient_id',
      doctorName: 'doctor_name',
      chiefComplaint: 'chief_complaint',
      nextVisitDate: 'next_visit_date'
    };

    const ALLOWED_COLUMNS = ['patient_id', 'doctor_name', 'date', 'medicines', 'notes', 'chief_complaint', 'diagnosis', 'next_visit_date'];

    for (const [key, value] of Object.entries(fields)) {
      const dbKey = mapping[key] || key;
      if (!ALLOWED_COLUMNS.includes(dbKey)) continue;

      updates.push(`${dbKey} = $${i}`);
      params.push(key === 'medicines' ? JSON.stringify(value) : value);
      i++;
    }

    const query = `UPDATE prescriptions SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await dbService.query(query, params);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Prescription not found' });
    
    // Save medicines for future recommendations if they were updated
    if (fields.medicines) {
      await saveMedicines(fields.medicines);
    }

    await activityService.log(req.user.sub, req.user.username, 'Update Prescription', `Updated prescription ${id}`, req.ip);
    const px = dbService.mapRows('prescriptions', result.rows)[0];
    emitEvent(SOCKET_EVENTS.PRESCRIPTION_UPDATED, px);
    res.json(px);
  } catch (error) {
    next(error);
  }
};

export const deletePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query('DELETE FROM prescriptions WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Prescription not found' });
    
    await activityService.log(req.user.sub, req.user.username, 'Delete Prescription', `Deleted prescription ${id}`, req.ip);
    emitEvent(SOCKET_EVENTS.PRESCRIPTION_UPDATED, { id, deleted: true });
    res.json({ message: 'Prescription deleted' });
  } catch (error) {
    next(error);
  }
};

export const sendWhatsApp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pxRes = await dbService.query('SELECT * FROM prescriptions WHERE id = $1', [id]);
    if (pxRes.rows.length === 0) return res.status(404).json({ message: 'Prescription not found' });
    const prescription = dbService.mapRows('prescriptions', pxRes.rows)[0];

    const patientRes = await dbService.query('SELECT * FROM patients WHERE id = $1', [prescription.patientId]);
    const patient = dbService.mapRows('patients', patientRes.rows)[0];

    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    await whatsappService.sendPrescription(patient, prescription);
    res.json({ message: 'WhatsApp message sent successfully' });
  } catch (error) {
    next(error);
  }
};
