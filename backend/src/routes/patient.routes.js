import { Router } from 'express';
import * as patientController from '../controllers/patient.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/', patientController.getPatients);
router.get('/:id', patientController.getPatient);
router.post('/', patientController.createPatient);
router.patch('/:id', patientController.updatePatient);

export default router;
