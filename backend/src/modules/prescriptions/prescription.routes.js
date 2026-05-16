import { Router } from 'express';
import * as prescriptionController from './prescription.controller.js';
import { validate } from '../../core/middleware/validate.js';
import { createPrescriptionSchema, updatePrescriptionSchema } from './prescription.validator.js';

const router = Router();

router.get('/', prescriptionController.getPrescriptions);
router.post('/', validate(createPrescriptionSchema), prescriptionController.createPrescription);
router.patch('/:id', validate(updatePrescriptionSchema), prescriptionController.updatePrescription);
router.delete('/:id', prescriptionController.deletePrescription);
router.get('/:id/download', prescriptionController.downloadPrescription);
router.post('/:id/send-whatsapp', prescriptionController.sendWhatsApp);

export default router;
