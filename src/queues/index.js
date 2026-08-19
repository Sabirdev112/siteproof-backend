import { logger } from '../lib/logger.js';
import { notImplemented } from '../lib/AppError.js';

export const queues = {
  ingestion: {
    async add({ documentId }) {
      setImmediate(async () => {
        try {
          const { ingestDocument } = await import('../modules/rulebooks/rulebooks.ingest.js');
          await ingestDocument(documentId);
        } catch (err) {
          logger.error({ err, documentId }, 'rulebook ingest failed');
        }
      });
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
