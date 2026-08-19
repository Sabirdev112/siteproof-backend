import { AppError } from '../lib/AppError.js';
import { env } from '../config/env.js';

const waiters = [];
let active = 0;

/** In-process limiter. Redis/BullMQ is optional later via REDIS_URL — not required for MVP. */
export function runLimited(work) {
  return new Promise((resolve, reject) => {
    const start = () => {
      active += 1;
      Promise.resolve()
        .then(work)
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          const next = waiters.shift();
          if (next) next();
        });
    };

    if (active < env.QUEUE_CONCURRENCY) {
      start();
      return;
    }
    if (waiters.length >= env.QUEUE_MAX_PENDING) {
      reject(new AppError('Extract or ingest is busy, retry shortly', 503, 'UNAVAILABLE'));
      return;
    }
    waiters.push(start);
  });
}

export function queueStats() {
  return { driver: 'memory', active, pending: waiters.length };
}
