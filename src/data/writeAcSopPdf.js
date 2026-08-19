import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAcSopPdf } from './generateAcSopPdf.js';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/ac-sop.pdf');
const pdf = await buildAcSopPdf();
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, pdf);
console.log(`wrote ${out} (${pdf.length} bytes)`);
