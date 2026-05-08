import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';

const router = Router();

router.post('/generate-prescription', aiController.generatePrescription);

export default router;
