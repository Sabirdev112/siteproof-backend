import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function randomToken() {
  return randomBytes(48).toString('base64url');
}

export function signPayload(secret, body, timestamp) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
