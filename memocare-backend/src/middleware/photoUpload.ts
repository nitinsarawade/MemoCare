import multer from 'multer';
import { AppError } from '../utils/errors';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB — plenty for a phone photo

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) return cb(null, true);
    return cb(AppError.badRequest('Only JPG, PNG, WEBP, or HEIC photos are accepted.'));
  },
});
