import { env } from '../../config/env.js';
import { AppError } from '../../lib/AppError.js';
import { query } from '../../db/query.js';
import { retrieveChunks } from '../rulebooks/rulebooks.service.js';
import { WIRING_RE } from '../../lib/wiring.js';

function clip(text, n = 280) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > n ? `${value.slice(0, n - 1)}…` : value;
}

function fromChunks(chunks) {
  return chunks.slice(0, 4).map((chunk) => ({
    ref: chunk.clauseRef || 'SOP',
    text: clip(chunk.content),
  }));
}

function heuristicReply(message, citations) {
  if (!citations.length) {
    return 'Nothing in this rulebook matched that question.';
  }
  const top = citations[0];
  return `${top.ref} says: ${top.text}`;
}

async function llmReply(message, citations) {
  const context = citations.map((c, i) => `${i + 1}. ${c.ref}: ${c.text}`).join('\n');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_VISION_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Answer only from the cited SOP clauses. If they do not cover the question, say so. Keep it to 3 sentences. Mention clause refs.',
        },
        { role: 'user', content: `Question: ${message}\n\nClauses:\n${context}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`chat failed ${res.status}`);
  const json = await res.json();
  return String(json.choices?.[0]?.message?.content || '').trim();
}

export async function chat(user, { rulebookId, message }) {
  const book = await query(`SELECT id FROM rulebooks WHERE id = $1 AND org_id = $2`, [rulebookId, user.org_id]);
  if (!book.rows[0]) throw new AppError('Rulebook not found', 404, 'NOT_FOUND');

  let chunks = await retrieveChunks(rulebookId, message, 6);
  if (!chunks.length && !WIRING_RE.test(message)) {
    const fallback = await query(
      `SELECT id, clause_ref AS "clauseRef", content FROM rulebook_chunks WHERE rulebook_id = $1 ORDER BY created_at ASC LIMIT 4`,
      [rulebookId],
    );
    chunks = fallback.rows;
  }
  const citations = fromChunks(chunks);
  if (!citations.length) return { reply: heuristicReply(message, citations), citations };

  if (!env.OPENAI_API_KEY) return { reply: heuristicReply(message, citations), citations };

  try {
    const reply = await llmReply(message, citations);
    return { reply: reply || heuristicReply(message, citations), citations };
  } catch {
    return { reply: heuristicReply(message, citations), citations };
  }
}
