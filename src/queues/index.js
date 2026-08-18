import { notImplemented } from '../lib/AppError.js';

/** In-process queue now; swap to BullMQ + Redis when traffic needs it. */
export const queues = {
  ingestion: {
    async add() {
      throw notImplemented('Rulebook ingestion queue (Phase 4)');
    },
  },
  extraction: {
    async add() {
      throw notImplemented('Extraction queue (Phase 5)');
    },
  },
  outbox: {
    async add() {
      throw notImplemented('Webhook outbox dispatcher (Phase 7)');
    },
  },
};
