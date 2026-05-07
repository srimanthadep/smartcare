import { Router } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import * as appointmentController from '../controllers/appointment.controller.js';
import * as invoiceController from '../controllers/invoice.controller.js';
import * as prescriptionController from '../controllers/prescription.controller.js';
import * as adminController from '../controllers/admin.controller.js';
import * as dentalController from '../controllers/dental.controller.js';
import { auth, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', authRoutes);

// Protected routes
router.use(auth);

router.get('/bootstrap', dashboardController.getBootstrap);
router.get('/dashboard', dashboardController.getDashboard);

router.use('/patients', patientRoutes);

router.get('/appointments', appointmentController.getAppointments);
router.post('/appointments', appointmentController.createAppointment);
router.patch('/appointments/:id', appointmentController.updateAppointment);

router.get('/invoices', invoiceController.getInvoices);
router.post('/invoices', invoiceController.createInvoice);
router.patch('/invoices/:id', invoiceController.updateInvoice);
router.delete('/invoices/:id', invoiceController.deleteInvoice);

router.get('/prescriptions', prescriptionController.getPrescriptions);
router.post('/prescriptions', prescriptionController.createPrescription);

router.get('/dental-chart/:patientId', dentalController.getDentalChart);
router.post('/dental-chart/:patientId', dentalController.updateDentalChart);

// Admin only
router.get('/activity-logs', authorize('admin'), adminController.getActivityLogs);

export default router;
