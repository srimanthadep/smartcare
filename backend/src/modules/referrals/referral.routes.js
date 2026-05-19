import { Router } from 'express';
import * as referralController from './referral.controller.js';
import { validate } from '../../core/middleware/validate.js';
import {
  createReferralSourceSchema,
  updateReferralSourceSchema,
  createPatientReferralSchema,
  updatePatientReferralSchema,
  createReferralActivitySchema,
  createReferralCommissionSchema,
  updateReferralCommissionSchema,
  createReferralRewardSchema,
  createReferralNoteSchema,
} from './referral.validator.js';

const router = Router();

// --- High-Impact Analytics ---
router.get('/analytics', referralController.getReferralAnalytics);

// --- Referral Sources CRM ---
router.get('/sources', referralController.getReferralSources);
router.post('/sources', validate(createReferralSourceSchema), referralController.createReferralSource);
router.get('/sources/:id', referralController.getReferralSourceById);
router.put('/sources/:id', validate(updateReferralSourceSchema), referralController.updateReferralSource);
router.delete('/sources/:id', referralController.deleteReferralSource);

// --- Patient Referrals ---
router.get('/patient-referrals', referralController.getPatientReferrals);
router.post('/patient-referrals', validate(createPatientReferralSchema), referralController.createPatientReferral);
router.get('/patient-referrals/:id', referralController.getPatientReferralById);
router.put('/patient-referrals/:id', validate(updatePatientReferralSchema), referralController.updatePatientReferral);
router.delete('/patient-referrals/:id', referralController.deletePatientReferral);

// --- Sub-Resources: Activities, Notes, Documents ---
router.get('/patient-referrals/:id/activities', referralController.getReferralActivities);
router.post('/patient-referrals/:id/activities', validate(createReferralActivitySchema), referralController.createReferralActivity);

router.get('/patient-referrals/:id/notes', referralController.getReferralNotes);
router.post('/patient-referrals/:id/notes', validate(createReferralNoteSchema), referralController.createReferralNote);

router.get('/patient-referrals/:id/documents', referralController.getReferralDocuments);
router.post('/patient-referrals/:id/documents', referralController.attachReferralDocument);

// --- Commissions & Rewards Hub ---
router.get('/commissions', referralController.getReferralCommissions);
router.put('/commissions/:id', validate(updateReferralCommissionSchema), referralController.updateReferralCommission);

router.get('/rewards', referralController.getReferralRewards);
router.post('/rewards', validate(createReferralRewardSchema), referralController.redeemReferralReward);
router.put('/rewards/:id/redeem', referralController.redeemReferralReward);

export default router;
