import multer from 'multer';
import { AppError } from '../utils/errors';

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25MB — enough for a scanned multi-page report

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) return cb(null, true);
    return cb(AppError.badRequest('Only PDF, Word documents, or images (JPG/PNG/WEBP/HEIC) are accepted.'));
  },
});
