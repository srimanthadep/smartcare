import { Router } from 'express';
import * as controller from './prescription-template.controller.js';
import { auth } from '../../core/middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/', controller.getTemplates);
router.post('/', controller.createTemplate);
router.patch('/:id', controller.updateTemplate);
router.delete('/:id', controller.deleteTemplate);

export default router;
