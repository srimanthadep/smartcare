import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  patientName: z.string().optional(),
  doctorName: z.string().optional().default(''),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  type: z.string().min(1, 'Type is required'),
  status: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled']).default('Scheduled'),
  reason: z.string().max(1000).optional().default(''),
  chairId: z.string().optional(),
  estimatedDuration: z.number().int().min(5).max(480).optional(),
  toothNumbers: z.array(z.number()).optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();
