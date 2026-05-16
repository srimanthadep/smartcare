import { z } from 'zod';

export const createInvoiceSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  patientName: z.string().optional(),
  date: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.number().min(0, 'Amount must be non-negative'),
    toothNumber: z.string().optional(),
  })).min(1, 'At least one item is required'),
  total: z.number().min(0),
  status: z.enum(['Paid', 'Pending', 'Overdue', 'Partially Paid']).default('Pending'),
  paidAmount: z.number().min(0).default(0),
  payments: z.array(z.object({
    date: z.string(),
    amount: z.number()
  })).optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();
