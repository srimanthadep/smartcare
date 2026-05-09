import { Router } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import medicineRoutes from './medicine.routes.js';
import aiRoutes from './ai.routes.js';
import prescriptionTemplateRoutes from './prescription-template.routes.js';
import backupRoutes from './backup.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import * as appointmentController from '../controllers/appointment.controller.js';
import * as invoiceController from '../controllers/invoice.controller.js';
import * as prescriptionController from '../controllers/prescription.controller.js';
import * as adminController from '../controllers/admin.controller.js';
import * as dentalController from '../controllers/dental.controller.js';
import { auth, authorize } from '../middleware/auth.js';
import { dbService } from '../services/db.service.js';
import { emailService } from '../services/email.service.js';

const router = Router();

// Public routes
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', authRoutes);

// Protected routes
router.use(auth);

router.get('/bootstrap', dashboardController.getBootstrap);
router.get('/dashboard', dashboardController.getDashboard);

// Email re-send endpoints
router.post('/patients/:id/send-welcome', async (req, res, next) => {
  try {
    const db = await dbService.read();
    const patient = db.patients.find(p => p.id === req.params.id);
    if (!patient || !patient.email) return res.status(400).json({ message: 'Patient or email not found' });
    console.log(`Manual trigger: Sending welcome email to ${patient.email}`);
    await emailService.sendWelcomeEmail(patient);
    res.json({ message: 'Welcome email sent' });
  } catch (error) { next(error); }
});

router.post('/prescriptions/:id/send-email', async (req, res, next) => {
  try {
    const db = await dbService.read();
    const px = db.prescriptions.find(p => p.id === req.params.id);
    if (!px) return res.status(404).json({ message: 'Prescription not found' });
    const patient = db.patients.find(p => p.id === px.patientId);
    if (!patient || !patient.email) return res.status(400).json({ message: 'Patient or email not found' });
    console.log(`Manual trigger: Sending prescription email to ${patient.email}`);
    await emailService.sendPrescriptionEmail(patient, px);
    res.json({ message: 'Prescription email sent' });
  } catch (error) { next(error); }
});

router.post('/invoices/:id/send-email', async (req, res, next) => {
  try {
    const db = await dbService.read();
    const invoice = db.invoices.find(i => i.id === req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const patient = db.patients.find(p => p.id === invoice.patientId);
    if (!patient || !patient.email) return res.status(400).json({ message: 'Patient or email not found' });
    console.log(`Manual trigger: Sending invoice email to ${patient.email}`);
    await emailService.sendInvoiceEmail(patient, invoice);
    res.json({ message: 'Invoice email sent' });
  } catch (error) { next(error); }
});

router.use('/patients', patientRoutes);
router.use('/medicines', medicineRoutes);
router.use('/ai', aiRoutes);
router.use('/prescription-templates', prescriptionTemplateRoutes);
router.use('/backup', backupRoutes);

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

// Dental Charts
router.get('/dental-chart/:patientId', dentalController.getDentalChart);
router.post('/dental-chart/:patientId', dentalController.updateDentalChart);

// Admin only
router.get('/activity-logs', authorize('admin'), adminController.getActivityLogs);

export default router;
