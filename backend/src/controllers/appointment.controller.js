import { dbService } from '../services/db.service.js';
import { emitEvent, SOCKET_EVENTS } from '../services/socket.service.js';

export const getAppointments = async (req, res, next) => {
  try {
    const { date, type, patientId } = req.query;
    
    let query = 'SELECT a.*, p.name as patient_name FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE a.is_deleted = FALSE';
    const params = [];
    let i = 1;

    if (patientId) {
      query += ` AND a.patient_id = $${i}`;
      params.push(patientId);
      i++;
    }
    if (date) {
      query += ` AND a.date = $${i}`;
      params.push(date);
      i++;
    }
    if (type && type !== 'all') {
      query += ` AND a.type = $${i}`;
      params.push(type);
      i++;
    }

    query += ' ORDER BY a.date ASC, a.time ASC';

    const resAppts = await dbService.query(query, params);
    res.json(dbService.mapRows('appointments', resAppts.rows));
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const id = await dbService.generateId('A', 'appointments');
    const { patientId, patientName, doctorName, date, time, type, status, reason } = req.body;

    const query = `
      INSERT INTO appointments (id, patient_id, doctor_name, date, time, type, status, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [id, patientId, doctorName, date, time, type, status || 'Scheduled', reason];
    
    const result = await dbService.query(query, params);
    
    // Fetch full appointment with patient name for the response
    const fullApptRes = await dbService.query(`
      SELECT a.*, p.name as patient_name 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = $1
    `, [id]);

    const appt = dbService.mapRows('appointments', fullApptRes.rows)[0];
    emitEvent(SOCKET_EVENTS.APPOINTMENT_UPDATED, appt);
    res.status(201).json(appt);
  } catch (error) {
    next(error);
  }
};

export const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const updates = [];
    const params = [id];
    let i = 2;

    const mapping = {
      patientId: 'patient_id',
      doctorName: 'doctor_name'
    };

    const ALLOWED_COLUMNS = ['patient_id', 'doctor_name', 'date', 'time', 'type', 'status', 'reason'];

    for (const [key, value] of Object.entries(fields)) {
      const dbKey = mapping[key] || key;
      if (!ALLOWED_COLUMNS.includes(dbKey)) continue;

      updates.push(`${dbKey} = $${i}`);
      params.push(value);
      i++;
    }

    const query = `UPDATE appointments SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    await dbService.query(query, params);

    // Fetch full appointment with patient name for the response
    const fullApptRes = await dbService.query(`
      SELECT a.*, p.name as patient_name 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = $1
    `, [id]);

    if (fullApptRes.rows.length === 0) return res.status(404).json({ message: 'Appointment not found' });
    const appt = dbService.mapRows('appointments', fullApptRes.rows)[0];
    emitEvent(SOCKET_EVENTS.APPOINTMENT_UPDATED, appt);
    res.json(appt);
  } catch (error) {
    next(error);
  }
};

export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query('UPDATE appointments SET is_deleted = TRUE WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Appointment not found' });
    emitEvent(SOCKET_EVENTS.APPOINTMENT_UPDATED, { id, deleted: true });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
