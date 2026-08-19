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
    async add(payload) {
      const { extractFinding } = await import('../modules/extraction/extraction.service.js');
      return extractFinding(payload.user, payload.body);
    },
  },
  outbox: {
    async add() {
      throw notImplemented('Webhook outbox dispatcher (Phase 7)');
    },
  },
};
