import { z } from 'zod';

export const createXraySchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  type: z.enum(['IOPA', 'OPG', 'CBCT', 'Bitewing', 'Cephalometric']).default('IOPA'),
  toothNumbers: z.preprocess(
    (val) => (typeof val === 'string' ? JSON.parse(val) : val),
    z.array(z.number().int().min(11).max(48)).default([])
  ),
  notes: z.string().max(5000).optional().default(''),
  diagnosis: z.string().max(5000).optional().default(''),
  tags: z.preprocess(
    (val) => (typeof val === 'string' ? JSON.parse(val) : val),
    z.array(z.string()).default([])
  ),
  takenDate: z.string().optional().nullable(),
});

export const updateXraySchema = z.object({
  type: z.enum(['IOPA', 'OPG', 'CBCT', 'Bitewing', 'Cephalometric']).optional(),
  toothNumbers: z.array(z.number().int().min(11).max(48)).optional(),
  notes: z.string().max(5000).optional(),
  diagnosis: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  takenDate: z.string().optional().nullable(),
});

export const reviewXraySchema = z.object({
  reviewed: z.boolean(),
});
