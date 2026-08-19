import { logger } from '../lib/logger.js';
import { runLimited } from './limit.js';

export const queues = {
  ingestion: {
    async add({ documentId }) {
      setImmediate(() => {
        runLimited(async () => {
          const { ingestDocument } = await import('../modules/rulebooks/rulebooks.ingest.js');
          await ingestDocument(documentId);
        }).catch((err) => logger.error({ err, documentId }, 'rulebook ingest failed'));
      });
    },
  },
  extraction: {
    async add(payload) {
      return runLimited(async () => {
        const { extractFinding } = await import('../modules/extraction/extraction.service.js');
        return extractFinding(payload.user, payload.body);
      });
    },
  },
  outbox: {
    async add() {
      const { dispatchPending } = await import('../events/outbox.js');
      setImmediate(() => dispatchPending().catch((err) => logger.error({ err }, 'outbox kick failed')));
    },
  },
};
