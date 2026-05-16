import { dbService } from '../../core/db/db.service.js';

export const getRecalls = async (req, res, next) => {
  try {
    // H4: Pagination
    const limit = parseInt(req.query.limit) || 200;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const result = await dbService.query(
      'SELECT * FROM recalls WHERE is_deleted = FALSE ORDER BY recall_date DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json(dbService.mapRows('recalls', result.rows));
  } catch (error) { next(error); }
};

export const createRecall = async (req, res, next) => {
  try {
    const { patientId, patientName, lastVisit, recallDate, status, type, notes } = req.body;
    const id = await dbService.generateId('RC', 'recalls');
    const result = await dbService.query(
      'INSERT INTO recalls (id, patient_id, patient_name, last_visit, recall_date, status, type, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [id, patientId, patientName, lastVisit, recallDate, status, type, notes]
    );
    res.status(201).json(dbService.mapRows('recalls', result.rows)[0]);
  } catch (error) { next(error); }
};

export const updateRecall = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const result = await dbService.query(
      'UPDATE recalls SET status = COALESCE($1, status), notes = COALESCE($2, notes) WHERE id = $3 RETURNING *',
      [status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Recall not found' });
    res.json(dbService.mapRows('recalls', result.rows)[0]);
  } catch (error) { next(error); }
};

export const deleteRecall = async (req, res, next) => {
  try {
    const result = await dbService.query('DELETE FROM recalls WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Recall not found' });
    res.json({ message: 'Recall deleted successfully' });
  } catch (error) { next(error); }
};
