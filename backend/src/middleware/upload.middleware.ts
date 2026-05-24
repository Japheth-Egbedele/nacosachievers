import multer from 'multer';
import { IMAGE_MAX_FILE_BYTES, VAULT_MAX_FILE_BYTES } from '../constants/auth.js';

const memoryStorage = multer.memoryStorage();

export const pdfUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: VAULT_MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files allowed'));
      return;
    }
    cb(null, true);
  },
});

export const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: IMAGE_MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, or WebP images allowed'));
      return;
    }
    cb(null, true);
  },
});
