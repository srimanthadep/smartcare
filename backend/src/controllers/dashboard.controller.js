import { dbService } from '../services/db.service.js';

export const getDashboard = async (req, res, next) => {
  try {
    const { period = 'monthly' } = req.query;
    const db = await dbService.read();
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
      // Default to "all time" or a large range if unknown, but let's stick to the period
      startDate = new Date(0); 
    }

    const filterByDate = (dateStr) => {
      const d = new Date(`${dateStr}T00:00:00`);
      return d >= startDate;
    };

    const filteredInvoices = db.invoices.filter(inv => filterByDate(inv.date));
    const filteredAppointments = db.appointments.filter(a => filterByDate(a.date) && a.status !== 'Cancelled');
    const todayAppointments = db.appointments.filter(a => a.date === todayStr && a.status !== 'Cancelled');

    const revenueTrendMap = new Map();
    const patientVisitMap = new Map();
    const departmentMap = new Map();
    const doctorDepartmentMap = new Map(db.doctors.map(d => [d.name, d.department]));

    filteredInvoices.forEach(inv => {
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

    filteredAppointments.forEach(app => {
      const day = new Date(`${app.date}T00:00:00`).toLocaleString('en-US', { weekday: 'short' });
      patientVisitMap.set(day, (patientVisitMap.get(day) || 0) + 1);
      const dept = doctorDepartmentMap.get(app.doctorName) || 'General Dentistry';
      departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
    });

    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    res.json({
      stats: {
        dailyPatients: todayAppointments.length,
        revenue: totalRevenue,
        profit: Math.round(totalRevenue * 0.8),
        appointments: filteredAppointments.length
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
    const db = await dbService.read();
    res.json({
      doctors: db.doctors,
      doctorAvailability: db.doctorAvailability,
      queue: db.queue,
      medicines: db.medicines,
      prescriptionTemplates: db.prescriptionTemplates
    });
  } catch (error) {
    next(error);
  }
};
