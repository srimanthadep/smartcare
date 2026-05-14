import { Router } from 'express';
import * as treatmentPlanController from '../controllers/treatment-plan.controller.js';
import { validate } from '../middleware/validate.js';
import { createTreatmentPlanSchema, updateTreatmentPlanSchema } from '../validators/treatment-plan.validator.js';

const router = Router();

router.get('/', treatmentPlanController.getTreatmentPlans);
router.post('/', validate(createTreatmentPlanSchema), treatmentPlanController.createTreatmentPlan);
router.patch('/:id', validate(updateTreatmentPlanSchema), treatmentPlanController.updateTreatmentPlan);
router.delete('/:id', treatmentPlanController.deleteTreatmentPlan);

export default router;
