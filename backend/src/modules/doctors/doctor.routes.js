import express from 'express';
import { getDoctors, createDoctor, updateDoctor, deleteDoctor } from './doctor.controller.js';
import { validate } from '../../core/middleware/validate.js';
import { createDoctorSchema, updateDoctorSchema } from './doctor.validator.js';

const router = express.Router();

router.get('/', getDoctors);
router.post('/', validate(createDoctorSchema), createDoctor);
router.put('/:id', validate(updateDoctorSchema), updateDoctor);
router.delete('/:id', deleteDoctor);

export default router;
