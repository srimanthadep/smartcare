import { Router } from 'express';
import * as xrayController from '../controllers/xray.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadXray, handleUploadError } from '../middleware/upload.js';
import { createXraySchema, updateXraySchema, reviewXraySchema } from '../validators/xray.validator.js';

const router = Router();

router.use(auth);

// Stats endpoint (must come before /:id)
router.get('/stats', xrayController.getXrayStats);

// List all X-rays (global) with filters
router.get('/', xrayController.getXrays);

// Get single X-ray
router.get('/:id', xrayController.getXray);

// Upload new X-ray (multipart/form-data)
// Note: validation runs AFTER multer parses the multipart body
router.post(
  '/',
  uploadXray.single('file'),
  handleUploadError,
  validate(createXraySchema),
  xrayController.createXray
);

// Update X-ray metadata
router.patch('/:id', validate(updateXraySchema), xrayController.updateXray);

// Review/unreview X-ray
router.patch('/:id/review', validate(reviewXraySchema), xrayController.reviewXray);

// Soft delete X-ray
router.delete('/:id', xrayController.deleteXray);

// AI Analysis
router.post('/:id/analyze', xrayController.analyzeXray);

export default router;
