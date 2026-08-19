import { env } from '../config/env.js';
import { localDriver } from './local.js';
import { cloudinaryDriver } from './cloudinary.js';

const drivers = {
  local: localDriver,
  cloudinary: cloudinaryDriver,
};

export const storage = drivers[env.STORAGE_DRIVER];
