import { z } from 'zod';

export const createRecallSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  patientName: z.string().optional().default(''),
  lastVisit: z.string().optional(),
  recallDate: z.string().min(1, 'Recall date is required'),
  status: z.enum(['Due', 'Overdue', 'Scheduled', 'Completed']).default('Scheduled'),
  type: z.enum(['Routine Checkup', 'Orthodontic Review', 'Post-Procedure', 'Periodontal', 'Follow-up']).default('Routine Checkup'),
  notes: z.string().max(2000).optional().default(''),
});

export const updateRecallSchema = createRecallSchema.partial();
