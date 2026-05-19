import { dbService } from '../../core/db/db.service.js';
import { emitEvent, SOCKET_EVENTS } from '../../shared/sockets/socket.service.js';
import { logActivity, saveMedicines, sendEmailJob, sendWhatsAppJob } from '../../shared/queue/jobQueue.service.js';
import { emailService } from '../../shared/services/email.service.js';
import { ensureWhatsAppReadyForQueue, formatPhone, whatsappService } from '../whatsapp/whatsapp.service.js';
import { pdfService } from '../../shared/services/pdf.service.js';

export const getPrescriptions = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    let query = 'SELECT * FROM prescriptions WHERE is_deleted = FALSE';
    const params = [];

    if (patientId) {
      params.push(patientId);
      query += ` AND patient_id = $${params.length}`;
    }
    // H4: Pagination
    const limit = parseInt(req.query.limit) || 200;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    params.push(limit);
    query += ` ORDER BY date DESC LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await dbService.query(query, params);
    res.json(dbService.mapRows('prescriptions', result.rows));
  } catch (error) {
    next(error);
  }
};

export const createPrescription = async (req, res, next) => {
  try {
    const id = await dbService.generateId('PR', 'prescriptions');
    const { patientId, patientName, doctorName, date, medicines, notes, chiefComplaint, diagnosis, nextVisitDate, treatmentPlan, templateId, xrayIds } = req.body;
    const pxDate = date || new Date().toISOString().slice(0, 10);

    const query = `
      INSERT INTO prescriptions (id, patient_id, doctor_name, date, medicines, notes, chief_complaint, diagnosis, next_visit_date, treatment_plan, template_id, xray_ids)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const params = [id, patientId, doctorName, pxDate, JSON.stringify(medicines), notes, chiefComplaint, diagnosis, nextVisitDate || null, JSON.stringify(treatmentPlan || []), templateId || null, JSON.stringify(xrayIds || [])];
    const result = await dbService.query(query, params);
    const prescription = dbService.mapRows('prescriptions', result.rows)[0];

    // ── Queue background jobs ──
    logActivity({
      userId: req.user.sub, userName: req.user.username,
      action: 'Create Prescription', details: `Created prescription for patient ${patientName}`, ip: req.ip
    });
    
    // Fetch patient for email/WhatsApp
    const patientRes = await dbService.query('SELECT * FROM patients WHERE id = $1', [patientId]);
    const patient = dbService.mapRows('patients', patientRes.rows)[0];

    if (patient && patient.email) {
      sendEmailJob('email-prescription', () => emailService.sendPrescriptionEmail(patient, prescription));
    }
    if (patient) {
      sendWhatsAppJob('wa-prescription', () => whatsappService.sendPrescription(patient, prescription));
    }
    
    // Save medicines for future recommendations (queued)
    saveMedicines(medicines);

    // Sync Treatment Plan to standalone table if provided
    if (treatmentPlan && Array.isArray(treatmentPlan) && treatmentPlan.length > 0) {
      try {
        const tpId = await dbService.generateId('TP', 'treatment_plans');
        const totalCost = treatmentPlan.reduce((sum, phase) => sum + (Number(phase.estimatedCost) || 0), 0);
        
        const tpQuery = `
          INSERT INTO treatment_plans (id, patient_id, dentist_name, notes, phases, total_cost, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await dbService.query(tpQuery, [
          tpId, patientId, doctorName || req.user.username, 
          `Generated from Prescription ${id}`, 
          JSON.stringify(treatmentPlan), 
          totalCost, 'Active'
        ]);
        emitEvent(SOCKET_EVENTS.PATIENT_UPDATED, { id: patientId, updateType: 'TREATMENT_PLAN' });
      } catch (tpErr) {
        console.error('Error syncing treatment plan from prescription:', tpErr);
      }
    }

    // Auto-create recall if nextVisitDate is specified
    if (nextVisitDate) {
      try {
        const rcId = await dbService.generateId('RC', 'recalls');
        await dbService.query(`
          INSERT INTO recalls (id, patient_id, patient_name, last_visit, recall_date, status, type, notes, source_prescription_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          rcId, patientId, patientName || 'Unknown Patient', pxDate, nextVisitDate, 'Scheduled', 'Follow-up', `Auto-generated from Prescription`, id
        ]);
        emitEvent(SOCKET_EVENTS.PATIENT_UPDATED, { id: patientId, updateType: 'RECALL' });
      } catch (rcErr) {
        console.error('Error auto-creating recall from prescription:', rcErr);
      }
    }

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

    // C4: Safe column mapping — only hardcoded strings ever reach SQL
    const COLUMN_MAP = {
      patientId: 'patient_id', patient_id: 'patient_id',
      doctorName: 'doctor_name', doctor_name: 'doctor_name',
      date: 'date', medicines: 'medicines', notes: 'notes',
      chiefComplaint: 'chief_complaint', chief_complaint: 'chief_complaint',
      diagnosis: 'diagnosis',
      nextVisitDate: 'next_visit_date', next_visit_date: 'next_visit_date',
      treatmentPlan: 'treatment_plan', treatment_plan: 'treatment_plan',
      templateId: 'template_id', template_id: 'template_id',
      xrayIds: 'xray_ids', xray_ids: 'xray_ids',
    };

    for (const [key, value] of Object.entries(fields)) {
      const dbCol = COLUMN_MAP[key];
      if (!dbCol) continue;

      let finalValue = (key === 'medicines' || key === 'treatmentPlan' || key === 'treatment_plan' || key === 'xrayIds' || key === 'xray_ids') ? JSON.stringify(value) : value;
      if (dbCol === 'next_visit_date' && !finalValue) finalValue = null;
      
      updates.push(`${dbCol} = $${i}`);
      params.push(finalValue);
      i++;
    }

    const query = `UPDATE prescriptions SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await dbService.query(query, params);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Prescription not found' });
    
    // Save medicines for future recommendations if they were updated (queued)
    if (fields.medicines) {
      saveMedicines(fields.medicines);
    }

    const px = dbService.mapRows('prescriptions', result.rows)[0];

    // Auto-sync recall if nextVisitDate was updated
    if (fields.nextVisitDate !== undefined) {
      try {
        const rcQuery = `SELECT * FROM recalls WHERE source_prescription_id = $1`;
        const rcRes = await dbService.query(rcQuery, [id]);
        
        if (fields.nextVisitDate === null || fields.nextVisitDate === '') {
           if (rcRes.rows.length > 0) {
             try {
               await dbService.query('DELETE FROM recalls WHERE source_prescription_id = $1', [id]);
             } catch (rcErr) {
               console.error('Error deleting auto-generated recall:', rcErr);
             }
           }
        } else {
           if (rcRes.rows.length > 0) {
             await dbService.query(`UPDATE recalls SET recall_date = $1 WHERE source_prescription_id = $2`, [fields.nextVisitDate, id]);
           } else {
             const patientRes = await dbService.query('SELECT name FROM patients WHERE id = $1', [px.patientId]);
             const patientName = patientRes.rows[0]?.name || 'Unknown Patient';
             const rcId = await dbService.generateId('RC', 'recalls');
             await dbService.query(`
               INSERT INTO recalls (id, patient_id, patient_name, last_visit, recall_date, status, type, notes, source_prescription_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             `, [rcId, px.patientId, patientName, px.date, fields.nextVisitDate, 'Scheduled', 'Follow-up', `Auto-generated from Prescription`, id]);
           }
        }
        emitEvent(SOCKET_EVENTS.PATIENT_UPDATED, { id: px.patientId, updateType: 'RECALL' });
      } catch (err) {
        console.error('Error auto-syncing recall on prescription update:', err);
      }
    }

    logActivity({
      userId: req.user.sub, userName: req.user.username,
      action: 'Update Prescription', details: `Updated prescription ${id}`, ip: req.ip
    });
    emitEvent(SOCKET_EVENTS.PRESCRIPTION_UPDATED, px);
    res.json(px);
  } catch (error) {
    next(error);
  }
};

export const deletePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.sub || null;
    const result = await dbService.query('UPDATE prescriptions SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2 WHERE id = $1 RETURNING id', [id, actorId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Prescription not found' });
    
    try {
      await dbService.query('DELETE FROM recalls WHERE source_prescription_id = $1', [id]);
    } catch (rcErr) {
      console.error('Error deleting auto-generated recall:', rcErr);
    }
    
    logActivity({
      userId: req.user.sub, userName: req.user.username,
      action: 'Delete Prescription', details: `Deleted prescription ${id}`, ip: req.ip
    });
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
    if (!formatPhone(patient.phone)) {
      return res.status(400).json({ message: 'Patient phone number is missing or invalid for WhatsApp. Use a 10-digit Indian mobile number.' });
    }

    const readiness = await ensureWhatsAppReadyForQueue();
    if (!readiness.canQueue) {
      return res.status(409).json({
        message: 'WhatsApp is not connected on this deployment. Open Settings, scan the WhatsApp QR code on the deployed app, then try again.',
      });
    }

    const queued = await whatsappService.sendPrescription(patient, prescription);
    if (!queued?.queued) {
      return res.status(500).json({ message: queued?.error || 'Failed to queue WhatsApp prescription' });
    }

    res.status(202).json({
      message: readiness.connected
        ? 'Prescription queued for WhatsApp delivery'
        : 'Prescription queued. WhatsApp is reconnecting and will send it shortly.',
    });
  } catch (error) {
    next(error);
  }
};

export const downloadPrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pxRes = await dbService.query(`
      SELECT pr.*, p.name as patient_name, p.phone as patient_phone, p.age, p.gender
      FROM prescriptions pr
      JOIN patients p ON pr.patient_id = p.id
      WHERE pr.id = $1
    `, [id]);

    if (pxRes.rows.length === 0) return res.status(404).json({ message: 'Prescription not found' });
    const prescription = dbService.mapRows('prescriptions', pxRes.rows)[0];
    const patient = {
      id: prescription.patientId,
      name: prescription.patientName,
      phone: prescription.patientPhone,
      age: prescription.age,
      gender: prescription.gender
    };

    // Fetch attached X-Rays
    let xrays = [];
    if (prescription.xrayIds && prescription.xrayIds.length > 0) {
      const xrayRes = await dbService.query('SELECT * FROM xrays WHERE id = ANY($1)', [prescription.xrayIds]);
      xrays = dbService.mapRows('xrays', xrayRes.rows);
    }

    const pdfBuffer = await pdfService.generatePrescriptionPDF(patient, prescription, xrays);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Prescription_${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
