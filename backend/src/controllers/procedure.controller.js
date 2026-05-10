import { dbService } from '../services/db.service.js';

export const getProcedures = async (req, res, next) => {
  try {
    const result = await dbService.query('SELECT * FROM clinical_procedures ORDER BY name ASC');
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const createProcedure = async (req, res, next) => {
  try {
    const id = await dbService.generateId('PR', 'clinical_procedures');
    const { name, price } = req.body;

    const query = `
      INSERT INTO clinical_procedures (id, name, price)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await dbService.query(query, [id, name, price || 0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateProcedure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;

    const query = `
      UPDATE clinical_procedures
      SET name = COALESCE($1, name), price = COALESCE($2, price)
      WHERE id = $3
      RETURNING *
    `;
    const result = await dbService.query(query, [name, price, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteProcedure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query('DELETE FROM clinical_procedures WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    res.json({ message: 'Procedure deleted successfully' });
  } catch (error) {
    next(error);
  }
};
