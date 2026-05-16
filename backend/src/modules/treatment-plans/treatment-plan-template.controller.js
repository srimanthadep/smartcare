import { dbService } from '../../core/db/db.service.js';

export const getTemplates = async (req, res, next) => {
  try {
    const result = await dbService.query('SELECT * FROM treatment_plan_templates WHERE is_deleted = FALSE ORDER BY name ASC');
    res.json(dbService.mapRows('treatment_plan_templates', result.rows));
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (req, res, next) => {
  try {
    const { name, phases, notes } = req.body;
    const id = await dbService.generateId('TPTPL', 'treatment_plan_templates');
    
    const result = await dbService.query(
      'INSERT INTO treatment_plan_templates (id, name, phases, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name, JSON.stringify(phases || []), notes]
    );
    
    res.status(201).json(dbService.mapRows('treatment_plan_templates', result.rows)[0]);
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phases, notes } = req.body;
    
    const result = await dbService.query(
      'UPDATE treatment_plan_templates SET name = $1, phases = $2, notes = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, JSON.stringify(phases), notes, id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ message: 'Template not found' });
    
    res.json(dbService.mapRows('treatment_plan_templates', result.rows)[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbService.query('UPDATE treatment_plan_templates SET is_deleted = TRUE WHERE id = $1', [id]);
    
    if (result.rowCount === 0) return res.status(404).json({ message: 'Template not found' });
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
