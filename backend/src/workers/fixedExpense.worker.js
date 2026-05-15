import cron from 'node-cron';
import { dbService } from '../services/db.service.js';

// Runs on 1st of every month at 6:00 AM
cron.schedule('0 6 1 * *', async () => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    
    const fixed = await dbService.query(
      `SELECT * FROM fixed_expenses WHERE last_recorded_month != $1 OR last_recorded_month IS NULL`,
      [currentMonth]
    );
    
    for (const expense of fixed.rows) {
      // Apply yearly rent hike (10% every January)
      let amount = Number(expense.amount);
      if (expense.category === 'Rent' && new Date().getMonth() === 0) {
        amount = Math.round(amount * 1.10);
        // Update base amount for future
        await dbService.query(`UPDATE fixed_expenses SET amount = $1 WHERE id = $2`, [amount, expense.id]);
      }
      
      const id = await dbService.generateId('EXP', 'expenses');
      await dbService.query(
        `INSERT INTO expenses (id, description, amount, category, date, tab) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, expense.description, amount, expense.category, new Date().toISOString().slice(0,10), expense.tab || 'Clinic Expenses']
      );
      
      await dbService.query(
        `UPDATE fixed_expenses SET last_recorded_month = $1 WHERE id = $2`,
        [currentMonth, expense.id]
      );
    }
    if (fixed.rows.length > 0) {
      console.log(`[FixedExpenses] Auto-recorded ${fixed.rows.length} fixed expenses for ${currentMonth}`);
    }
  } catch (err) {
    console.error('[FixedExpenses] Error auto-recording fixed expenses:', err);
  }
});
