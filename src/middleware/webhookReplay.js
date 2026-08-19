import { AppError } from '../lib/AppError.js';
import { env } from '../config/env.js';

export function webhookReplayWindow(req, _res, next) {
  const raw = req.header('x-siteproof-timestamp') || '';
  const ts = Number(raw);
  const now = Math.floor(Date.now() / 1000);
  if (!raw || !Number.isFinite(ts)) {
    return next(new AppError('Missing webhook timestamp', 401, 'UNAUTHORIZED'));
  }
  if (Math.abs(now - ts) > env.WEBHOOK_REPLAY_WINDOW_SECONDS) {
    return next(new AppError('Webhook timestamp outside replay window', 401, 'UNAUTHORIZED'));
  }
  next();
}
