import path from 'path';
import multer from 'multer';
import { AppError } from '../utils/errors';

// In-memory storage: the controller hands the buffer to storageService,
// which persists it (local disk in dev, S3 in production). Keeps
// StorageService as the single place that knows about file paths/buckets.
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB ceiling for video sessions

// Browsers (especially on Windows) often report an empty or generic MIME type
// for perfectly valid recordings like iPhone .MOV files, so fall back to the
// file extension when the reported type isn't audio/* or video/*.
const EXTENSION_MIME: Record<string, string> = {
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.3gp': 'video/3gpp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.flac': 'audio/flac',
  '.amr': 'audio/amr',
};

export const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (/^(audio|video)\//.test(file.mimetype)) return cb(null, true);

    const inferred = EXTENSION_MIME[path.extname(file.originalname).toLowerCase()];
    if (inferred) {
      file.mimetype = inferred; // normalise so downstream code sees a real media type
      return cb(null, true);
    }
    return cb(AppError.badRequest('Only audio or video files are accepted (e.g. .mp3, .wav, .m4a, .mp4, .mov, .webm)'));
  },
});
