import { dbService } from '../services/db.service.js';

export const getDashboard = async (req, res, next) => {
  try {
    let { period = 'monthly' } = req.query;
    if (typeof period !== 'string' || period.includes('[object')) {
      period = 'monthly';
    }
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    let startDate = new Date();
    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'yearly') {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(0); 
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    // Parallel fetch only needed tables
    const [invoicesRes, apptsRes, doctorsRes] = await Promise.all([
      dbService.query('SELECT * FROM invoices WHERE date >= $1 AND is_deleted = FALSE', [startDateStr]),
      dbService.query(`
        SELECT a.*, p.name as patient_name 
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.date >= $1 AND a.status != $2 AND a.is_deleted = FALSE
      `, [startDateStr, 'Cancelled']),
      dbService.query('SELECT * FROM doctors')
    ]);

    const invoices = dbService.mapRows('invoices', invoicesRes.rows);
    const appointments = dbService.mapRows('appointments', apptsRes.rows);
    const doctors = doctorsRes.rows;

    // Global Totals (independent of the period filter)
    const [patientCountRes, globalInvoicesRes, expensesRes] = await Promise.all([
      dbService.query('SELECT COUNT(*) FROM patients WHERE is_deleted = FALSE'),
      dbService.query('SELECT SUM(total) as total_rev, SUM(paid_amount) as total_paid FROM invoices WHERE is_deleted = FALSE'),
      dbService.query('SELECT SUM(amount) as total_exp FROM expenses WHERE is_deleted = FALSE')
    ]);

    const totalPatients = parseInt(patientCountRes.rows[0].count);
    const totalRevenueGlobal = Number(globalInvoicesRes.rows[0].total_rev || 0);
    const totalPaidGlobal = Number(globalInvoicesRes.rows[0].total_paid || 0);
    const totalPendingGlobal = totalRevenueGlobal - totalPaidGlobal;
    const totalExpensesGlobal = Number(expensesRes.rows[0].total_exp || 0);

    const todayAppointments = appointments.filter(a => a.date === todayStr);

    const revenueTrendMap = new Map();
    const patientVisitMap = new Map();
    const departmentMap = new Map();
    const doctorDepartmentMap = new Map(doctors.map(d => [d.name, d.department]));

    invoices.forEach(inv => {
      const date = new Date(`${inv.date}T00:00:00`);
      let label;
      if (period === 'daily' || period === 'weekly') {
        label = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      } else if (period === 'monthly') {
        label = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short' });
      }
      revenueTrendMap.set(label, (revenueTrendMap.get(label) || 0) + Number(inv.total || 0));
    });

    appointments.forEach(app => {
      const day = new Date(`${app.date}T00:00:00`).toLocaleString('en-US', { weekday: 'short' });
      patientVisitMap.set(day, (patientVisitMap.get(day) || 0) + 1);
      const dept = doctorDepartmentMap.get(app.doctorName) || 'General Dentistry';
      departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    res.json({
      stats: {
        dailyPatients: todayAppointments.length,
        totalPatients,
        totalRevenue: totalRevenueGlobal,
        totalPaid: totalPaidGlobal,
        totalPending: totalPendingGlobal,
        totalExpenses: totalExpensesGlobal,
        periodRevenue: totalRevenue,
        appointments: appointments.length
      },
      revenueTrend: Array.from(revenueTrendMap.entries()).map(([month, revenue]) => ({ month, revenue })),
      patientVisits: Array.from(patientVisitMap.entries()).map(([day, visits]) => ({ day, visits })),
      departmentBreakdown: Array.from(departmentMap.entries()).map(([name, value], index) => ({
        name,
        value,
        fill: ['hsl(219, 85%, 40%)', 'hsl(0, 72%, 51%)', 'hsl(160, 84%, 39%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)'][index % 5]
      })),
      appointmentsToday: todayAppointments.sort((a, b) => a.time.localeCompare(b.time))
    });
  } catch (error) {
    next(error);
  }
};

export const getBootstrap = async (req, res, next) => {
  try {
    const [doctors, medicines, templates] = await Promise.all([
      dbService.query('SELECT * FROM doctors'),
      dbService.query('SELECT * FROM medicines'),
      dbService.query('SELECT * FROM prescription_templates'),
    ]);

    res.json({
      doctors: doctors.rows,
      medicines: medicines.rows,
      prescriptionTemplates: templates.rows
    });
  } catch (error) {
    next(error);
  }
};
