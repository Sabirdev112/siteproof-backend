import { v2 as cloudinary } from 'cloudinary';
import { env } from '../src/config/env.js';

const tinyJpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAD/EABQQAQAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAn//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AX//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/An//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2Q==',
  'base64',
);

if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
  console.error('Cloudinary env vars missing (check .env has no leading spaces on CLOUDINARY_*)');
  process.exit(1);
}

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ping = await cloudinary.api.ping();
console.log('ping', ping.status || ping);

const uploaded = await new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
      folder: `${env.CLOUDINARY_FOLDER || 'siteproof'}/healthcheck`,
      public_id: `probe-${Date.now()}`,
      resource_type: 'image',
      overwrite: true,
    },
    (err, result) => (err ? reject(err) : resolve(result)),
  );
  stream.end(tinyJpeg);
});

const fetched = await fetch(uploaded.secure_url);
console.log('upload', {
  cloud: env.CLOUDINARY_CLOUD_NAME,
  publicId: uploaded.public_id,
  bytes: uploaded.bytes,
  fetchStatus: fetched.status,
});

await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: 'image' });
console.log('cloudinary ok');
