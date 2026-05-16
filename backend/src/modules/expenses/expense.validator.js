import { z } from 'zod';

export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.coerce.number().min(0, 'Amount must be non-negative'),
  category: z.string().max(100).optional().nullable().default('General'),
  date: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();
