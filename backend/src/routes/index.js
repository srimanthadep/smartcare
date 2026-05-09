import { Router } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import medicineRoutes from './medicine.routes.js';
import aiRoutes from './ai.routes.js';
import prescriptionTemplateRoutes from './prescription-template.routes.js';
import treatmentPlanRoutes from './treatment-plan.routes.js';
import backupRoutes from './backup.js';
import whatsappRoutes from './whatsapp.routes.js';
import emailRoutes from './email.routes.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import * as appointmentController from '../controllers/appointment.controller.js';
import * as invoiceController from '../controllers/invoice.controller.js';
import * as prescriptionController from '../controllers/prescription.controller.js';
import * as adminController from '../controllers/admin.controller.js';
import * as dentalController from '../controllers/dental.controller.js';
import { auth, authorize } from '../middleware/auth.js';
import { dbService } from '../services/db.service.js';
import { emailService } from '../services/email.service.js';

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
router.use('/whatsapp', whatsappRoutes);
router.use('/email', emailRoutes);

// Protected routes
router.use(auth);

router.get('/bootstrap', dashboardController.getBootstrap);
router.get('/dashboard', dashboardController.getDashboard);

// Email re-send endpoints
router.post('/patients/:id/send-welcome', async (req, res, next) => {
  try {
    const resPat = await dbService.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    const patient = dbService.mapRows('patients', resPat.rows)[0];
    if (!patient || !patient.email) return res.status(400).json({ message: 'Patient or email not found' });
    console.log(`Manual trigger: Sending welcome email to ${patient.email}`);
    await emailService.sendWelcomeEmail(patient);
    res.json({ message: 'Welcome email sent' });
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
    
    console.log(`Manual trigger: Sending prescription email to ${patient.email}`);
    await emailService.sendPrescriptionEmail(patient, px);
    res.json({ message: 'Prescription email sent' });
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
    
    console.log(`Manual trigger: Sending invoice email to ${patient.email}`);
    await emailService.sendInvoiceEmail(patient, invoice);
    res.json({ message: 'Invoice email sent' });
  } catch (error) { next(error); }
});

router.use('/patients', patientRoutes);
router.use('/medicines', medicineRoutes);
router.use('/ai', aiRateLimit, aiRoutes);
router.use('/prescription-templates', prescriptionTemplateRoutes);
router.use('/treatment-plans', treatmentPlanRoutes);
router.use('/backup', authorize('admin'), backupRoutes);

// Appointments
router.get('/appointments', appointmentController.getAppointments);
router.post('/appointments', appointmentController.createAppointment);
router.patch('/appointments/:id', appointmentController.updateAppointment);
router.delete('/appointments/:id', appointmentController.deleteAppointment);

// Invoices
router.get('/invoices', invoiceController.getInvoices);
router.post('/invoices', invoiceController.createInvoice);
router.patch('/invoices/:id', invoiceController.updateInvoice);
router.delete('/invoices/:id', invoiceController.deleteInvoice);

// Prescriptions
router.get('/prescriptions', prescriptionController.getPrescriptions);
router.post('/prescriptions', prescriptionController.createPrescription);
router.patch('/prescriptions/:id', prescriptionController.updatePrescription);
router.delete('/prescriptions/:id', prescriptionController.deletePrescription);
router.post('/prescriptions/:id/send-whatsapp', prescriptionController.sendWhatsApp);
router.post('/invoices/:id/send-whatsapp', async (req, res, next) => {
  try {
    const resInv = await dbService.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    const invoice = dbService.mapRows('invoices', resInv.rows)[0];
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    
    const resPat = await dbService.query('SELECT * FROM patients WHERE id = $1', [invoice.patientId]);
    const patient = dbService.mapRows('patients', resPat.rows)[0];
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    import('../services/whatsapp.service.js').then(({ whatsappService }) => {
      whatsappService.sendInvoice(patient, invoice);
    });
    res.json({ message: 'Invoice WhatsApp sent' });
  } catch (error) { next(error); }
});

// Dental Charts
router.get('/dental-chart/:patientId', dentalController.getDentalChart);
router.post('/dental-chart/:patientId', dentalController.updateDentalChart);

// Admin only
router.get('/activity-logs', authorize('admin'), adminController.getActivityLogs);

export default router;
