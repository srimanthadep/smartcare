import crypto from 'crypto';
import { sqliteQueue } from '../queue/sqliteQueue.service.js';
import sharp from 'sharp';
import { cloudinary } from '../../core/config/cloudinary.js';
import { getThumbnailUrl } from '../../core/config/cloudinary.js';

export const mediaCacheService = {
  hashBuffer(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  },

  async generateThumbnail(buffer, opts = { width: 600 }) {
    try {
      const thumb = await sharp(buffer).resize({ width: opts.width }).webp({ quality: 70 }).toBuffer();
      return thumb;
    } catch (err) {
      console.error('mediaCacheService: thumbnail generation failed', err.message);
      return null;
    }
  },

  async storeBuffer(buffer, mime, fileName, uploadToCloud = true) {
    const hash = this.hashBuffer(buffer);
    const base64 = buffer.toString('base64');

    let provider = null;
    let providerId = null;
    let secureUrl = null;

    try {
      if (uploadToCloud) {
        const isPdf = mime === 'application/pdf';
        let uploadBuffer = buffer;
        let uploadMime = mime;
        let uploadFileName = fileName;

        // Convert images to WEBP for smaller size
        if (!isPdf && mime.startsWith('image')) {
          try {
            uploadBuffer = await sharp(buffer).webp({ quality: 75 }).toBuffer();
            uploadMime = 'image/webp';
            uploadFileName = fileName.replace(/\.[^.]+$/, '') + '.webp';
          } catch (e) {
            console.warn('mediaCacheService: webp conversion failed, using original image');
          }
        }

        const uploadBase64 = uploadBuffer.toString('base64');
        const options = { resource_type: isPdf ? 'raw' : 'image', public_id: `smartcare/${uploadFileName.replace(/\W+/g, '_')}_${Date.now()}` };
        const res = await cloudinary.uploader.upload(`data:${uploadMime};base64,${uploadBase64}`, options);
        provider = 'cloudinary';
        providerId = res.public_id;
        secureUrl = res.secure_url;
      }
    } catch (err) {
      console.error('mediaCacheService: cloud upload failed', err.message);
    }

    sqliteQueue.addMediaCache(hash, mime, fileName, base64, provider, providerId);

    return { hash, provider, providerId, secureUrl };
  },

  getByHash(hash) {
    return sqliteQueue.getMediaCache(hash);
  }
};
