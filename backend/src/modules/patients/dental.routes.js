import { Router } from 'express';
import * as dentalController from './dental.controller.js';

const router = Router();

router.get('/:patientId', dentalController.getDentalChart);
router.post('/:patientId', dentalController.updateDentalChart);

export default router;
