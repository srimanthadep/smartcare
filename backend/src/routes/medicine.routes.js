import { Router } from 'express';
import * as medicineController from '../controllers/medicine.controller.js';

const router = Router();

router.get('/search', medicineController.searchMedicines);

export default router;
