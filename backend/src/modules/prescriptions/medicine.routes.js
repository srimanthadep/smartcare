import { Router } from 'express';
import * as medicineController from './medicine.controller.js';

const router = Router();

router.get('/search', medicineController.searchMedicines);

export default router;
