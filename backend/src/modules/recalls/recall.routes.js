import { Router } from 'express';
import * as recallController from './recall.controller.js';
import { validate } from '../../core/middleware/validate.js';
import { createRecallSchema, updateRecallSchema } from './recall.validator.js';

const router = Router();

router.get('/', recallController.getRecalls);
router.post('/', validate(createRecallSchema), recallController.createRecall);
router.patch('/:id', validate(updateRecallSchema), recallController.updateRecall);
router.delete('/:id', recallController.deleteRecall);

export default router;
