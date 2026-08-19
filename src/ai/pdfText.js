import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export async function extractPdfText(buffer) {
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  const result = await pdfParse(buffer);
  return String(result.text || '').trim();
}

