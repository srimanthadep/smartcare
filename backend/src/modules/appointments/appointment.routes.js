import { Router } from 'express';
import * as appointmentController from './appointment.controller.js';
import { validate } from '../../core/middleware/validate.js';
import { createAppointmentSchema, updateAppointmentSchema } from './appointment.validator.js';

const router = Router();

router.get('/', appointmentController.getAppointments);
router.post('/', validate(createAppointmentSchema), appointmentController.createAppointment);
router.patch('/:id', validate(updateAppointmentSchema), appointmentController.updateAppointment);
router.delete('/:id', appointmentController.deleteAppointment);

export default router;
