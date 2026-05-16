import { z } from 'zod';

export const createDoctorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  specialization: z.string().max(200).optional().default(''),
  department: z.string().max(100).optional().default(''),
  phone: z.string().max(20).optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
});

export const updateDoctorSchema = createDoctorSchema.partial();
