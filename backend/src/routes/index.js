import { Router } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import medicineRoutes from './medicine.routes.js';
import aiRoutes from './ai.routes.js';
import prescriptionTemplateRoutes from './prescription-template.routes.js';
import treatmentPlanTemplateRoutes from './treatment-plan-template.routes.js';
import treatmentPlanRoutes from './treatment-plan.routes.js';
import procedureRoutes from './procedure.routes.js';
import backupRoutes from './backup.js';
import whatsappRoutes from './whatsapp.routes.js';
import emailRoutes from './email.routes.js';
import expenseRoutes from './expense.routes.js';
import doctorRoutes from './doctor.routes.js';
import recallRoutes from './recall.routes.js';
import queueRoutes from './queue.routes.js';
import xrayRoutes from './xray.routes.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import * as appointmentController from '../controllers/appointment.controller.js';
import * as invoiceController from '../controllers/invoice.controller.js';
import * as prescriptionController from '../controllers/prescription.controller.js';
import * as adminController from '../controllers/admin.controller.js';
import { validate } from '../middleware/validate.js';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/invoice.validator.js';
import { createAppointmentSchema, updateAppointmentSchema } from '../validators/appointment.validator.js';
import { createPrescriptionSchema, updatePrescriptionSchema } from '../validators/prescription.validator.js';
import * as dentalController from '../controllers/dental.controller.js';
import * as xrayController from '../controllers/xray.controller.js';
import { auth, authorize } from '../middleware/auth.js';
import { dbService } from '../services/db.service.js';
import { addEmailJob, EMAIL_JOBS } from '../queues/email.queue.js';
import { addWhatsAppJob, WHATSAPP_JOBS } from '../queues/whatsapp.queue.js';
import { bullBoardAdapter } from '../queues/index.js';

import rateLimit from 'express-rate-limit';

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { message: 'Too many login attempts, please try again after a minute' }
});

const aiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
  message: { message: 'Too many AI requests, please try again after a minute' }
});

// Public routes
router.get('/', (req, res) => res.json({ status: 'ok', message: 'API is operational' }));
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', authRateLimit, authRoutes);

// Protected routes
router.use(auth);

// H10: WhatsApp/Email routes now behind auth
router.use('/whatsapp', whatsappRoutes);
router.use('/email', emailRoutes);

// ── Bull Board Admin Dashboard ──
// Accessible at /api/admin/queues (requires authentication)
router.use('/admin/queues', bullBoardAdapter.getRouter());

router.get('/bootstrap', dashboardController.getBootstrap);
router.get('/dashboard', dashboardController.getDashboard);

// Email re-send endpoints (now queued)
router.post('/patients/:id/send-welcome', async (req, res, next) => {
  try {
    const resPat = await dbService.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    const patient = dbService.mapRows('patients', resPat.rows)[0];
    if (!patient || !patient.email) return res.status(400).json({ message: 'Patient or email not found' });
    console.log(`Manual trigger: Queuing welcome email for ${patient.email}`);
    addEmailJob(EMAIL_JOBS.WELCOME, { patient });
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
    
    console.log(`Manual trigger: Queuing prescription email for ${patient.email}`);
    addEmailJob(EMAIL_JOBS.PRESCRIPTION, { patient, prescription: px });
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
    
    console.log(`Manual trigger: Queuing invoice email for ${patient.email}`);
    addEmailJob(EMAIL_JOBS.INVOICE, { patient, invoice });
    res.json({ message: 'Invoice email queued for delivery' });
  } catch (error) { next(error); }
});

router.use('/patients', patientRoutes);
router.use('/medicines', medicineRoutes);
router.use('/ai', aiRateLimit, aiRoutes);
router.use('/prescription-templates', prescriptionTemplateRoutes);
router.use('/treatment-plan-templates', treatmentPlanTemplateRoutes);
router.use('/treatment-plans', treatmentPlanRoutes);
router.use('/procedures', procedureRoutes);
router.use('/backup', backupRoutes);
router.use('/expenses', expenseRoutes);
router.use('/doctors', doctorRoutes);
router.use('/recalls', recallRoutes);
router.use('/queues', queueRoutes);
router.use('/xrays', xrayRoutes);

// Appointments (H1: validated)
router.get('/appointments', appointmentController.getAppointments);
router.post('/appointments', validate(createAppointmentSchema), appointmentController.createAppointment);
router.patch('/appointments/:id', validate(updateAppointmentSchema), appointmentController.updateAppointment);
router.delete('/appointments/:id', appointmentController.deleteAppointment);

// Invoices (H1: validated)
router.get('/invoices', invoiceController.getInvoices);
router.post('/invoices', validate(createInvoiceSchema), invoiceController.createInvoice);
router.patch('/invoices/:id', validate(updateInvoiceSchema), invoiceController.updateInvoice);
router.delete('/invoices/:id', invoiceController.deleteInvoice);
router.get('/invoices/:id/download', invoiceController.downloadInvoice);

// Prescriptions (H1: validated)
router.get('/prescriptions', prescriptionController.getPrescriptions);
router.post('/prescriptions', validate(createPrescriptionSchema), prescriptionController.createPrescription);
router.patch('/prescriptions/:id', validate(updatePrescriptionSchema), prescriptionController.updatePrescription);
router.delete('/prescriptions/:id', prescriptionController.deletePrescription);
router.get('/prescriptions/:id/download', prescriptionController.downloadPrescription);
router.post('/prescriptions/:id/send-whatsapp', prescriptionController.sendWhatsApp);
router.post('/invoices/:id/send-whatsapp', async (req, res, next) => {
  try {
    const resInv = await dbService.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    const invoice = dbService.mapRows('invoices', resInv.rows)[0];
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    
    const resPat = await dbService.query('SELECT * FROM patients WHERE id = $1', [invoice.patientId]);
    const patient = dbService.mapRows('patients', resPat.rows)[0];
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    addWhatsAppJob(WHATSAPP_JOBS.INVOICE, { patient, invoice });
    res.json({ message: 'Invoice WhatsApp queued for delivery' });
  } catch (error) { next(error); }
});

// Dental Charts
router.get('/dental-chart/:patientId', dentalController.getDentalChart);
router.post('/dental-chart/:patientId', dentalController.updateDentalChart);

// Patient X-Rays (scoped)
router.get('/patients/:id/xrays', xrayController.getPatientXrays);

// Logs (Accessible to staff)
router.get('/activity-logs', adminController.getActivityLogs);

export default router;
