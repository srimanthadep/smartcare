import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { config } from './env.js';

// ── Cloudinary SDK Configuration ─────────────────────────────────
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true,
});

// ── Multer-Cloudinary Storage for X-Ray uploads ──────────────────
export const xrayStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const patientId = req.body.patientId || 'unknown';
    const isPdf = file.mimetype === 'application/pdf';

    return {
      folder: `smartcare/xrays/${patientId}`,
      resource_type: isPdf ? 'raw' : 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      transformation: isPdf
        ? []
        : [{ quality: 'auto:good', fetch_format: 'auto' }],
      public_id: `xray_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  },
});

/**
 * Generate a Cloudinary thumbnail URL from the original URL.
 * For images: uses Cloudinary transforms (c_thumb, w_300, h_300).
 * For PDFs: returns null (thumbnails generated client-side or skipped).
 */
export function getThumbnailUrl(originalUrl, resourceType = 'image') {
  if (resourceType === 'raw' || !originalUrl) return null;

  // Insert transformation before /upload/ segment
  // Example: https://res.cloudinary.com/xxx/image/upload/v123/folder/file.jpg
  //       → https://res.cloudinary.com/xxx/image/upload/c_thumb,w_300,h_300,q_auto/v123/folder/file.jpg
  const parts = originalUrl.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/c_thumb,w_300,h_300,g_center,q_auto/${parts[1]}`;
  }
  return originalUrl;
}

/**
 * Delete a resource from Cloudinary by public ID.
 */
export async function deleteFromCloudinary(publicId, resourceType = 'image') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
    return null;
  }
}

export { cloudinary };
