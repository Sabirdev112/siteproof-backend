import { embedTexts, embedQuery } from './embed.js';
import { transcribeAudio, inspectPhotos } from './extract.js';
import { decideVerdict } from './verdict.js';

export const ai = {
  embed: embedTexts,
  embedQuery,
  transcribe: transcribeAudio,
  inspectImage: inspectPhotos,
  verdict: decideVerdict,
};
