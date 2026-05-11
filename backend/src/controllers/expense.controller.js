import { dbService } from '../services/db.service.js';
import { aiService } from '../services/ai.service.js';

export const getExpenses = async (req, res, next) => {
  try {
    const result = await dbService.query('SELECT * FROM expenses WHERE is_deleted = FALSE ORDER BY date DESC, created_at DESC');
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

export const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    await dbService.query('UPDATE expenses SET is_deleted = TRUE WHERE id = $1', [id]);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
};
