import { z } from 'zod';

export const createReferralSourceSchema = z.object({
  name: z.string().min(1, 'Referral source name is required'),
  type: z.enum([
    'doctor', 'clinic', 'hospital', 'patient', 'corporate', 
    'insurance', 'marketing', 'walk_in', 'campaign', 'social_media'
  ]),
  contactName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().email('Invalid email address').or(z.literal('')).optional().default(''),
  address: z.string().optional().default(''),
  commissionType: z.enum(['percentage', 'flat']).default('percentage'),
  commissionValue: z.number().nonnegative('Value must be positive').default(0),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateReferralSourceSchema = createReferralSourceSchema.partial();

export const createPatientReferralSchema = z.object({
  patientId: z.string().optional(),
  patientName: z.string().min(1, 'Patient name is required'),
  patientPhone: z.string().optional().default(''),
  patientEmail: z.string().email('Invalid email address').or(z.literal('')).optional().default(''),
  sourceId: z.string().min(1, 'Source ID is required'),
  referredToDoctorId: z.string().optional(),
  status: z.enum([
    'received', 'scheduled', 'consulted', 'treatment_accepted', 
    'in_progress', 'completed', 'commission_released'
  ]).default('received'),
  notes: z.string().optional().default(''),
  treatmentPlanId: z.string().optional(),
  estimatedRevenue: z.number().nonnegative().optional().default(0),
  actualRevenue: z.number().nonnegative().optional().default(0),
});

export const updatePatientReferralSchema = createPatientReferralSchema.partial();

export const createReferralActivitySchema = z.object({
  activityType: z.string().min(1, 'Activity type is required'),
  description: z.string().min(1, 'Description is required'),
});

export const createReferralCommissionSchema = z.object({
  invoiceId: z.string().optional(),
  commissionAmount: z.number().positive('Amount must be positive'),
  status: z.enum(['pending', 'approved', 'released', 'cancelled']).default('pending'),
  notes: z.string().optional().default(''),
});

export const updateReferralCommissionSchema = createReferralCommissionSchema.partial();

export const createReferralRewardSchema = z.object({
  patientId: z.string().min(1, 'Referring Patient ID is required'),
  rewardType: z.enum(['points', 'discount_voucher', 'gift_card']).default('points'),
  rewardValue: z.number().positive('Value must be positive'),
  status: z.enum(['available', 'redeemed', 'expired']).default('available'),
});

export const updateReferralRewardSchema = createReferralRewardSchema.partial();

export const createReferralNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
});
