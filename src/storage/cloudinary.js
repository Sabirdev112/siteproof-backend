import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { AppError } from '../lib/AppError.js';

export function cloudinaryConfigured() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function ensureConfig() {
  if (!cloudinaryConfigured()) {
    throw new AppError(
      'Cloudinary is not configured (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
      500,
      'STORAGE_NOT_CONFIGURED',
    );
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function parseKey(key) {
  const [resourceType, ...rest] = key.split(':');
  return { resourceType: resourceType || 'image', publicId: rest.join(':') };
}

export const cloudinaryDriver = {
  async put({ key, body, contentType, type }) {
    ensureConfig();
    const resourceType = type === 'audio' ? 'video' : 'image';
    const publicId = key.replace(/\.[^.]+$/, '');
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: resourceType,
          folder: env.CLOUDINARY_FOLDER,
          overwrite: true,
        },
        (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
      );
      stream.end(body);
    });
    void contentType;
    return { key: `${resourceType}:${result.public_id}` };
  },

  async getBuffer(storageKey) {
    const url = await this.getSignedUrl(storageKey, { expiresIn: 120 });
    const res = await fetch(url);
    if (!res.ok) {
      throw new AppError(`Cloudinary fetch failed (${res.status})`, 502, 'STORAGE_ERROR');
    }
    return Buffer.from(await res.arrayBuffer());
  },

  async getSignedUrl(storageKey, { expiresIn } = {}) {
    ensureConfig();
    const { resourceType, publicId } = parseKey(storageKey);
    const expiresAt = Math.floor(Date.now() / 1000) + (expiresIn || env.MEDIA_SIGN_TTL_SECONDS);
    return cloudinary.url(publicId, {
      resource_type: resourceType,
      type: 'upload',
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
    });
  },

  async remove(storageKey) {
    ensureConfig();
    const { resourceType, publicId } = parseKey(storageKey);
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  },
};
