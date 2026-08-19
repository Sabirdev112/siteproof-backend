export const PHOTO_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
export const AUDIO_MIMES = new Set(['audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/aac']);
export const PDF_MIMES = new Set(['application/pdf']);
export const PHOTO_MAX_BYTES = 12 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 15 * 1024 * 1024;
export const PDF_MAX_BYTES = 25 * 1024 * 1024;

const EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
};

export function extensionFor(mime) {
  return EXT[mime] || 'bin';
}

export function maxBytesFor(type) {
  return type === 'audio' ? AUDIO_MAX_BYTES : PHOTO_MAX_BYTES;
}

export function assertAllowedMime(type, mime) {
  const allowed = type === 'audio' ? AUDIO_MIMES : PHOTO_MIMES;
  return allowed.has(mime);
}
