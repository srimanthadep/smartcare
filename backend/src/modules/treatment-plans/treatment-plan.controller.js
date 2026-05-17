import { dbService } from '../../core/db/db.service.js';
import { emitEvent, SOCKET_EVENTS } from '../../shared/sockets/socket.service.js';

export const getTreatmentPlans = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });

    const result = await dbService.query('SELECT * FROM treatment_plans WHERE patient_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC', [patientId]);
    res.json(dbService.mapRows('treatment_plans', result.rows));
  } catch (error) {
    next(error);
  }
};

export const createTreatmentPlan = async (req, res, next) => {
  try {
    const id = await dbService.generateId('TP', 'treatment_plans');
    const { patientId, dentistName, notes, phases, totalCost, status } = req.body;

    const query = `
      INSERT INTO treatment_plans (id, patient_id, dentist_name, notes, phases, total_cost, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [
      id, patientId, dentistName || req.user.username, notes, 
      JSON.stringify(phases || []), totalCost || 0, status || 'Active'
    ];

    const result = await dbService.query(query, params);
    const plan = dbService.mapRows('treatment_plans', result.rows)[0];

    emitEvent(SOCKET_EVENTS.PATIENT_UPDATED, { id: patientId, updateType: 'TREATMENT_PLAN' });
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
};

export const updateTreatmentPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, phases, totalCost } = req.body;

    const updates = [];
    const params = [id];
    let i = 2;

    const COLUMN_MAP = {
      status: 'status',
      notes: 'notes',
      phases: 'phases',
      totalCost: 'total_cost',
      total_cost: 'total_cost'
    };

    for (const [key, value] of Object.entries(req.body)) {
      const dbCol = COLUMN_MAP[key];
      if (!dbCol) continue;

      if (value !== undefined) {
        updates.push(`${dbCol} = $${i}`);
        params.push(dbCol === 'phases' ? JSON.stringify(value) : value);
        i++;
      }
    }

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

    const query = `UPDATE treatment_plans SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await dbService.query(query, params);
    
    if (result.rows.length === 0) return res.status(404).json({ message: 'Treatment plan not found' });
    
    const plan = dbService.mapRows('treatment_plans', result.rows)[0];
    res.json(plan);
  } catch (error) {
    next(error);
  }
};

export const deleteTreatmentPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query('UPDATE treatment_plans SET is_deleted = TRUE WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Treatment plan not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
