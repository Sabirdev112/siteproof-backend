import { notImplemented } from '../lib/AppError.js';
import { embedTexts, embedQuery } from './embed.js';

export const ai = {
  embed: embedTexts,
  embedQuery,
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
