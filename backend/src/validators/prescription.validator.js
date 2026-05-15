import { z } from 'zod';

const medicineSchema = z.object({
  name: z.string().min(1, 'Medicine name is required'),
  dosage: z.string().optional().default(''),
  frequency: z.string().optional().default(''),
  duration: z.string().optional(),
  instructions: z.string().optional(),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  patientName: z.string().optional(),
  doctorName: z.string().optional(),
  date: z.string().optional(),
  medicines: z.array(medicineSchema).min(1, 'At least one medicine is required'),
  notes: z.string().max(5000).optional().default(''),
  chiefComplaint: z.string().max(1000).optional(),
  diagnosis: z.string().max(2000).optional(),
  nextVisitDate: z.string().optional().nullable(),
  treatmentPlan: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional().default(''),
    toothNumbers: z.array(z.number()).optional().default([]),
    estimatedCost: z.number().min(0).optional().default(0),
    status: z.enum(['Planned', 'In Progress', 'Completed', 'Cancelled']).optional().default('Planned'),
  })).optional().default([]),
  templateId: z.string().optional().nullable(),
});

export const updatePrescriptionSchema = createPrescriptionSchema.partial();
