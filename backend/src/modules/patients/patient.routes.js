import { Router } from 'express';
import * as patientController from './patient.controller.js';
import { auth } from '../../core/middleware/auth.js';

import { validate } from '../../core/middleware/validate.js';
import { createPatientSchema, updatePatientSchema } from './patient.validator.js';

const router = Router();

router.use(auth);

router.get('/', patientController.getPatients);
router.get('/:id', patientController.getPatient);
router.post('/', validate(createPatientSchema), patientController.createPatient);
router.patch('/:id', validate(updatePatientSchema), patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

export default router;
