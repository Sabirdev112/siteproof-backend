import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { EMBEDDING_DIM } from '../config/constants.js';

function normalize(vec) {
  let n = 0;
  for (const v of vec) n += v * v;
  n = Math.sqrt(n) || 1;
  return Array.from(vec, (v) => v / n);
}

/** Deterministic hashed embedding so search works without an API key. */
export function hashEmbed(text, dim = EMBEDDING_DIM) {
  const vec = new Float64Array(dim);
  const tokens = String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
  for (const token of tokens) {
    const h = createHash('sha256').update(token).digest();
    const idx = h.readUInt16BE(0) % dim;
    vec[idx] += h[2] & 1 ? 1 : -1;
  }
  return normalize(vec);
}

function toVectorLiteral(values) {
  return `[${values.map((v) => (Number.isFinite(v) ? v.toFixed(8) : '0')).join(',')}]`;
}

async function openaiEmbed(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: env.EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.data.sort((a, b) => a.index - b.index).map((row) => row.embedding);
}

export async function embedTexts(texts) {
  if (!texts.length) return [];
  if (env.OPENAI_API_KEY) {
    const out = [];
    for (let i = 0; i < texts.length; i += 64) {
      out.push(...(await openaiEmbed(texts.slice(i, i + 64))));
    }
    return out.map(toVectorLiteral);
  }
  return texts.map((text) => toVectorLiteral(hashEmbed(text)));
}

export async function embedQuery(text) {
  const [vec] = await embedTexts([text]);
  return vec;
}
