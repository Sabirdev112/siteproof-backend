import { notImplemented } from '../lib/AppError.js';
import { embedTexts, embedQuery } from './embed.js';
import { transcribeAudio, inspectPhotos } from './extract.js';

export const ai = {
  embed: embedTexts,
  embedQuery,
  transcribe: transcribeAudio,
  inspectImage: inspectPhotos,
  async verdict() {
    throw notImplemented('Compliance LLM (Phase 6)');
  },
};
