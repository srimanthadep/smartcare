import multer from 'multer';
import { xrayStorage } from '../config/cloudinary.js';

// ── Allowed MIME types for X-Ray uploads ─────────────────────────
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

/**
 * Multer middleware for X-Ray file uploads via Cloudinary.
 * - Validates file type (jpg, png, webp, pdf)
 * - Enforces 15MB size limit
 * - Stores directly to Cloudinary (no local temp files)
 */
export const uploadXray = multer({
  storage: xrayStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP, PDF`
        ),
        false
      );
    }
  },
});

/**
 * Error handling middleware for multer upload errors.
 * Wrap route handler with this to get clean JSON error responses.
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
