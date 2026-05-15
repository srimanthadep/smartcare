import { dbService } from './src/services/db.service.js';

async function run() {
  try {
    await dbService.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tab TEXT DEFAULT \'Clinic Expenses\';');
    console.log('Added tab column to expenses');
    
    await dbService.query(`
      CREATE TABLE IF NOT EXISTS fixed_expenses (
        id VARCHAR(20) PRIMARY KEY,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        tab TEXT DEFAULT 'Clinic Expenses',
        is_percentage_hike BOOLEAN DEFAULT FALSE,
        hike_percentage NUMERIC DEFAULT 0,
        last_recorded_month TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Created fixed_expenses table');
    
    const fixed = await dbService.query('SELECT COUNT(*) FROM fixed_expenses');
    if (fixed.rows[0].count == 0) {
      await dbService.query(`
        INSERT INTO fixed_expenses (id, description, category, amount, tab) VALUES
          ('FXD001', 'Monthly Clinic Rent', 'Rent', 30250, 'Clinic Expenses'),
          ('FXD002', 'Maid Salary', 'Maid Salary', 2000, 'Clinic Expenses');
      `);
      console.log('Seeded fixed expenses');
    }
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
