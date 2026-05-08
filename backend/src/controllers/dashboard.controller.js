import { dbService } from '../services/db.service.js';

export const getDashboard = async (req, res, next) => {
  try {
    const { period = 'monthly' } = req.query;
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
      dbService.query('SELECT * FROM invoices WHERE date >= $1', [startDateStr]),
      dbService.query('SELECT * FROM appointments WHERE date >= $1 AND status != $2', [startDateStr, 'Cancelled']),
      dbService.query('SELECT * FROM doctors')
    ]);

    const invoices = dbService.mapRows('invoices', invoicesRes.rows);
    const appointments = dbService.mapRows('appointments', apptsRes.rows);
    const doctors = doctorsRes.rows;

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
        revenue: totalRevenue,
        profit: Math.round(totalRevenue * 0.8),
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
    const [doctors, availability, queue, medicines, templates] = await Promise.all([
      dbService.query('SELECT * FROM doctors'),
      dbService.query('SELECT * FROM doctor_availability'),
      dbService.query('SELECT * FROM queue'),
      dbService.query('SELECT * FROM medicines'),
      dbService.query('SELECT * FROM prescription_templates')
    ]);

    res.json({
      doctors: doctors.rows,
      doctorAvailability: dbService.mapRows('doctor_availability', availability.rows),
      queue: dbService.mapRows('queue', queue.rows),
      medicines: medicines.rows,
      prescriptionTemplates: templates.rows
    });
  } catch (error) {
    next(error);
  }
};
