import { z } from 'zod';

const phaseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Phase name is required'),
  description: z.string().optional().default(''),
  toothNumbers: z.array(z.number()).optional().default([]),
  estimatedCost: z.number().min(0).optional().default(0),
  cost: z.number().min(0).optional().default(0),
  status: z.enum(['Planned', 'In Progress', 'Completed', 'Cancelled']).optional().default('Planned'),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
});

export const createTreatmentPlanSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  dentistName: z.string().optional().default(''),
  notes: z.string().max(5000).optional().default(''),
  phases: z.array(phaseSchema).min(1, 'At least one phase is required'),
  totalCost: z.number().min(0).optional().default(0),
  status: z.enum(['Active', 'Completed', 'Cancelled']).default('Active'),
});

export const updateTreatmentPlanSchema = createTreatmentPlanSchema.partial();
