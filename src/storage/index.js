import { env } from '../config/env.js';
import { notImplemented } from '../lib/AppError.js';

const drivers = {
  local: {
    async put() {
      throw notImplemented('Local object storage (Phase 3)');
    },
    async getSignedUrl() {
      throw notImplemented('Local object storage (Phase 3)');
    },
  },
  s3: {
    async put() {
      throw notImplemented('S3 object storage (Phase 3)');
    },
    async getSignedUrl() {
      throw notImplemented('S3 object storage (Phase 3)');
    },
  },
};

export const storage = drivers[env.STORAGE_DRIVER];
