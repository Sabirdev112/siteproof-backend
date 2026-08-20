export const PHOTO_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
export const AUDIO_MIMES = new Set([
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/aacp',
  'audio/3gpp',
  'audio/3gpp2',
  'audio/amr',
  'audio/webm',
  'audio/ogg',
  'video/mp4', // some phones label m4a voice notes this way
]);
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
  'audio/wave': 'wav',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/aacp': 'aac',
  'audio/3gpp': '3gp',
  'audio/3gpp2': '3g2',
  'audio/amr': 'amr',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'video/mp4': 'm4a',
};

export function extensionFor(mime) {
  return EXT[mime] || 'bin';
}

export function maxBytesFor(type) {
  return type === 'audio' ? AUDIO_MAX_BYTES : PHOTO_MAX_BYTES;
}

export function assertAllowedMime(type, mime) {
  if (type === 'audio') {
    if (AUDIO_MIMES.has(mime)) return true;
    // Expo / Android sometimes send empty or application/octet-stream for m4a
    return !mime || mime === 'application/octet-stream';
  }
  return PHOTO_MIMES.has(mime);
}
