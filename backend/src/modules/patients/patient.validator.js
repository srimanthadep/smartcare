import { z } from 'zod';

export const createPatientSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  phone: z.string().min(7).max(20).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']).optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  address: z.string().max(500).optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
  })).optional(),
  consultationFee: z.number().min(0).default(300),
  chiefComplaint: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  dentalHistory: z.object({
    lastVisit: z.string().optional().or(z.literal('')),
    hygiene: z.string().optional(),
    history: z.string().optional(),
    tobacco: z.string().optional(),
  }).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();
