import { Router } from 'express';
import * as templateController from './treatment-plan-template.controller.js';

const router = Router();

router.get('/', templateController.getTemplates);
router.post('/', templateController.createTemplate);
router.patch('/:id', templateController.updateTemplate);
router.delete('/:id', templateController.deleteTemplate);

export default router;
