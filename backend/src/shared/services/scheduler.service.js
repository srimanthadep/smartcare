import cron from 'node-cron';
import { dbService } from '../../core/db/db.service.js';
import { runScheduledBackupIfDue } from './backup.service.js';
import { whatsappService } from '../../modules/whatsapp/whatsapp.service.js';

export const initScheduler = () => {
  console.log('[Scheduler] Initializing cron jobs...');

  // 1. Daily backup — '0 2 * * *' IST
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[Scheduler] Running daily backup check...');
      await runScheduledBackupIfDue();
    } catch (err) {
      console.error('[Scheduler] Daily backup error:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  // 2. Appointment reminders — '0 9 * * *' IST
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('[Scheduler] Running appointment reminders...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDateStr = tomorrow.toISOString().slice(0, 10);

      const res = await dbService.query(
        `SELECT a.*, p.name as "patientName", p.phone as "patientPhone"
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         WHERE a.date = $1 AND a.status != 'Cancelled'`,
        [tomorrowDateStr]
      );
      
      const appointments = res.rows;
      let sentCount = 0;

      for (const row of appointments) {
        // Format object exactly as previous worker probably expected
        const appt = {
          id: row.id,
          patientId: row.patient_id,
          date: row.date,
          time: row.time,
          status: row.status,
          type: row.type,
          patient: {
             name: row.patientName,
             phone: row.patientPhone
          }
        };

        try {
          await whatsappService.sendReminder(appt);
          sentCount++;
        } catch (e) {
          console.error(`[Scheduler] Failed to send reminder to ${row.patientPhone}:`, e);
        }
      }

      console.log(`[Scheduler] Sent ${sentCount}/${appointments.length} appointment reminders.`);
    } catch (err) {
      console.error('[Scheduler] Appointment reminders error:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  // 3. Fixed expenses — '0 6 1 * *' IST
  cron.schedule('0 6 1 * *', async () => {
    try {
      console.log('[Scheduler] Running fixed expenses auto-recording...');
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
        console.log(`[Scheduler] Auto-recorded ${fixed.rows.length} fixed expenses for ${currentMonth}`);
      }
    } catch (err) {
      console.error('[Scheduler] Error auto-recording fixed expenses:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[Scheduler] Cron jobs initialized successfully.');
};
