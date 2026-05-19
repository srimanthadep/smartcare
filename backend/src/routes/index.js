import { Router } from 'express';
import rateLimit from 'express-rate-limit';

// Modules
import authRoutes from '../modules/auth/auth.routes.js';
import patientRoutes from '../modules/patients/patient.routes.js';
import dentalRoutes from '../modules/patients/dental.routes.js';
import appointmentRoutes from '../modules/appointments/appointment.routes.js';
import invoiceRoutes from '../modules/invoices/invoice.routes.js';
import prescriptionRoutes from '../modules/prescriptions/prescription.routes.js';
import medicineRoutes from '../modules/prescriptions/medicine.routes.js';
import prescriptionTemplateRoutes from '../modules/prescriptions/prescription-template.routes.js';
import treatmentPlanRoutes from '../modules/treatment-plans/treatment-plan.routes.js';
import treatmentPlanTemplateRoutes from '../modules/treatment-plans/treatment-plan-template.routes.js';
import procedureRoutes from '../modules/treatment-plans/procedure.routes.js';
import xrayRoutes from '../modules/xrays/xray.routes.js';
import whatsappRoutes from '../modules/whatsapp/whatsapp.routes.js';
import emailRoutes from '../modules/notifications/email.routes.js';
import expenseRoutes from '../modules/expenses/expense.routes.js';
import doctorRoutes from '../modules/doctors/doctor.routes.js';
import recallRoutes from '../modules/recalls/recall.routes.js';
import aiRoutes from '../modules/ai/ai.routes.js';

// Shared / Core
import backupRoutes from '../shared/services/backup.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import * as dashboardController from '../modules/dashboard/dashboard.controller.js';
import * as adminController from '../modules/auth/admin.controller.js';
import * as xrayController from '../modules/xrays/xray.controller.js';
import { auth } from '../core/middleware/auth.js';
import { dbService } from '../core/db/db.service.js';
import { sendEmailJob, sendWhatsAppJob } from '../shared/queue/jobQueue.service.js';
import { emailService } from '../shared/services/email.service.js';
import { whatsappService } from '../modules/whatsapp/whatsapp.service.js';

import * as doctorController from '../modules/doctors/doctor.controller.js';
import * as appointmentController from '../modules/appointments/appointment.controller.js';

const router = Router();

// Rate Limiters
const authRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts, please try again after a minute' }
});

const aiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { message: 'Too many AI requests, please try again after a minute' }
});

const publicRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: { message: 'Too many requests, please try again later' }
});

// Public Routes
router.get('/', (req, res) => res.json({ status: 'ok', message: 'API is operational' }));
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', authRateLimit, authRoutes);

// Public Booking Routes
router.get('/public/doctors', publicRateLimit, doctorController.getDoctors);
router.post('/public/appointments', publicRateLimit, appointmentController.createPublicAppointment);

// Protected Routes
router.use(auth);

// Core Logic
router.get('/bootstrap', dashboardController.getBootstrap);
router.get('/dashboard', dashboardController.getDashboard);
router.get('/activity-logs', adminController.getActivityLogs);

// Module Routes
router.use('/patients', patientRoutes);
router.use('/dental-chart', dentalRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/medicines', medicineRoutes);
router.use('/prescription-templates', prescriptionTemplateRoutes);
router.use('/treatment-plans', treatmentPlanRoutes);
router.use('/treatment-plan-templates', treatmentPlanTemplateRoutes);
router.use('/procedures', procedureRoutes);
router.use('/xrays', xrayRoutes);
router.use('/expenses', expenseRoutes);
router.use('/doctors', doctorRoutes);
router.use('/recalls', recallRoutes);
router.use('/ai', aiRateLimit, aiRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/email', emailRoutes);
router.use('/backup', backupRoutes);
router.use('/admin', adminRoutes);

// Shared Patient Scoped Routes
router.get('/patients/:id/xrays', xrayController.getPatientXrays);

// Manual Notification Trigger Endpoints
router.post('/patients/:id/send-welcome', async (req, res, next) => {
  try {
    const resPat = await dbService.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    const patient = dbService.mapRows('patients', resPat.rows)[0];
    if (!patient || !patient.email) return res.status(400).json({ message: 'Patient or email not found' });
    sendEmailJob('email-welcome', () => emailService.sendWelcomeEmail(patient));
    res.json({ message: 'Welcome email queued for delivery' });
  } catch (error) { next(error); }
});

router.post('/prescriptions/:id/send-email', async (req, res, next) => {
  try {
    const resPx = await dbService.query('SELECT * FROM prescriptions WHERE id = $1', [req.params.id]);
    const px = dbService.mapRows('prescriptions', resPx.rows)[0];
    if (!px) return res.status(404).json({ message: 'Prescription not found' });
    const resPat = await dbService.query('SELECT * FROM patients WHERE id = $1', [px.patientId]);
    const patient = dbService.mapRows('patients', resPat.rows)[0];
    if (!patient || !patient.email) return res.status(400).json({ message: 'Patient or email not found' });
    sendEmailJob('email-prescription', () => emailService.sendPrescriptionEmail(patient, px));
    res.json({ message: 'Prescription email queued for delivery' });
  } catch (error) { next(error); }
});

router.post('/invoices/:id/send-email', async (req, res, next) => {
  try {
    const resInv = await dbService.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    const invoice = dbService.mapRows('invoices', resInv.rows)[0];
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const resPat = await dbService.query('SELECT * FROM patients WHERE id = $1', [invoice.patientId]);
    const patient = dbService.mapRows('patients', resPat.rows)[0];
    if (!patient || !patient.email) return res.status(400).json({ message: 'Patient or email not found' });
    sendEmailJob('email-invoice', () => emailService.sendInvoiceEmail(patient, invoice));
    res.json({ message: 'Invoice email queued for delivery' });
  } catch (error) { next(error); }
});

router.post('/invoices/:id/send-whatsapp', async (req, res, next) => {
  try {
    const resInv = await dbService.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    const invoice = dbService.mapRows('invoices', resInv.rows)[0];
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const resPat = await dbService.query('SELECT * FROM patients WHERE id = $1', [invoice.patientId]);
    const patient = dbService.mapRows('patients', resPat.rows)[0];
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    sendWhatsAppJob('wa-invoice', () => whatsappService.sendInvoice(patient, invoice));
    res.json({ message: 'Invoice WhatsApp queued for delivery' });
  } catch (error) { next(error); }
});

export default router;
