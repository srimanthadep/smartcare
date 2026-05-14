import { dbService } from '../services/db.service.js';
import { aiService } from '../services/ai.service.js';

export const getExpenses = async (req, res, next) => {
  try {
    // H4: Pagination
    const limit = parseInt(req.query.limit) || 200;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const result = await dbService.query(
      `SELECT * FROM expenses WHERE is_deleted = FALSE ORDER BY date DESC, created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const { description, amount, date, category: providedCategory } = req.body;
    const id = await dbService.generateId('EXP', 'expenses');
    
    // Use provided category if available, otherwise auto-categorize with AI
    const category = providedCategory || await aiService.autoCategorizeExpense(description);
    
    const result = await dbService.query(
      'INSERT INTO expenses (id, description, amount, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, description, amount, category, date || new Date()]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, amount, date, category } = req.body;
    
    const updates = [];
    const params = [id];
    let i = 2;
    
    if (description !== undefined) { updates.push(`description = $${i}`); params.push(description); i++; }
    if (amount !== undefined) { updates.push(`amount = $${i}`); params.push(amount); i++; }
    if (date !== undefined) { updates.push(`date = $${i}`); params.push(date); i++; }
    if (category !== undefined) { updates.push(`category = $${i}`); params.push(category); i++; }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    const result = await dbService.query(
      `UPDATE expenses SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    await dbService.query('UPDATE expenses SET is_deleted = TRUE WHERE id = $1', [id]);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
};
