import { Router } from 'express';
import * as procedureController from '../controllers/procedure.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/', procedureController.getProcedures);
router.post('/', procedureController.createProcedure);
router.put('/:id', procedureController.updateProcedure);
router.delete('/:id', procedureController.deleteProcedure);

export default router;
