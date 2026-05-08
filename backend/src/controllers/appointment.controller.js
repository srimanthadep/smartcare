import { dbService } from '../services/db.service.js';

export const getAppointments = async (req, res, next) => {
  try {
    const { date, type } = req.query;
    
    let query = 'SELECT * FROM appointments WHERE 1=1';
    const params = [];

    if (date) {
      params.push(date);
      query += ` AND date = $${params.length}`;
    }
    if (type && type !== 'all') {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    query += ' ORDER BY date ASC, time ASC';

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
    res.status(201).json(dbService.mapRows('appointments', result.rows)[0]);
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

    for (const [key, value] of Object.entries(fields)) {
      const dbKey = mapping[key] || key;
      updates.push(`${dbKey} = $${i}`);
      params.push(value);
      i++;
    }

    const query = `UPDATE appointments SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await dbService.query(query, params);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Appointment not found' });
    res.json(dbService.mapRows('appointments', result.rows)[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await dbService.query('DELETE FROM appointments WHERE id = $1', [id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
