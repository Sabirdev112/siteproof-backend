import { notImplemented } from '../lib/AppError.js';

/** Transactional outbox. Insert in the same DB tx as job close; dispatcher posts to n8n. */
export const outbox = {
  async enqueue() {
    throw notImplemented('Event outbox (Phase 7)');
  },
};
