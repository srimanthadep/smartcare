import { Router } from 'express';
import * as treatmentPlanController from '../controllers/treatment-plan.controller.js';

const router = Router();

router.get('/', treatmentPlanController.getTreatmentPlans);
router.post('/', treatmentPlanController.createTreatmentPlan);
router.patch('/:id', treatmentPlanController.updateTreatmentPlan);
router.delete('/:id', treatmentPlanController.deleteTreatmentPlan);

export default router;
