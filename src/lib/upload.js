import multer from 'multer';
import { AppError } from './AppError.js';

export function singleFileUpload({ maxBytes, field = 'file' }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
  });

  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large', 413, 'PAYLOAD_TOO_LARGE'));
      }
      return next(new AppError(err.message, 400, 'VALIDATION_ERROR'));
    });
  };
}
