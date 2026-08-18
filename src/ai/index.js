import { notImplemented } from '../lib/AppError.js';

export const ai = {
  async embed() {
    throw notImplemented('Embeddings (Phase 4)');
  },
  async transcribe() {
    throw notImplemented('Speech-to-text (Phase 5)');
  },
  async inspectImage() {
    throw notImplemented('Vision extraction (Phase 5)');
  },
  async verdict() {
    throw notImplemented('Compliance LLM (Phase 6)');
  },
};
