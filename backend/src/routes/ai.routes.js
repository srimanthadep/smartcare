import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';

const router = Router();

router.post('/generate-prescription', aiController.generatePrescription);
router.post('/generate-treatment-plan', aiController.generateTreatmentPlan);
router.post('/refine-notes', aiController.refineNotes);
router.post('/chat', aiController.chat);

export default router;
