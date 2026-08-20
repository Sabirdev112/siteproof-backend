import { env } from '../config/env.js';
import { AppError } from '../lib/AppError.js';
import { VERDICTS, SEVERITIES } from '../config/constants.js';
import { WIRING_RE, pickCitedClause } from '../lib/wiring.js';

const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'at',
  'for',
  'is',
  'are',
  'be',
  'with',
  'from',
  'this',
  'that',
  'it',
  'as',
  'by',
  'not',
  'no',
  'must',
  'should',
  'sop',
  'section',
]);

function clip(text, n = 280) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > n ? `${value.slice(0, n - 1)}…` : value;
}

function findingBlob({ transcript, attributes }) {
  const attrs = attributes || {};
  return [transcript, attrs.object, attrs.condition, attrs.location, attrs.apparentIssue]
    .filter(Boolean)
    .join(' ');
}

function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Overlap of finding tokens with clause text (0–1). */
export function clauseRelevance(blob, clause) {
  const q = new Set(tokens(blob));
  if (!q.size) return 0;
  const hay = tokens(`${clause.clauseRef || ''} ${clause.content || ''}`);
  if (!hay.length) return 0;
  let hit = 0;
  for (const t of hay) {
    if (q.has(t)) hit += 1;
  }
  const uniqQ = q.size;
  return Math.min(1, hit / Math.max(3, Math.min(uniqQ, 12)));
}

export function filterRelevantClauses(blob, clauses, minScore = 0.12) {
  const list = clauses || [];
  const scored = list
    .map((c) => ({ ...c, relevance: Math.max(Number(c.score) || 0, clauseRelevance(blob, c)) }))
    .filter(
      (c) =>
        c.relevance >= minScore ||
        (WIRING_RE.test(blob) &&
          /§3\.[37]|conductor|wiring|insulation/i.test(`${c.clauseRef} ${c.content}`)),
    )
    .sort((a, b) => b.relevance - a.relevance);
  return scored;
}

function heuristicVerdict(blob, clauses) {
  const top = pickCitedClause(blob, clauses) || clauses[0];
  const citedClause = { ref: top.clauseRef || 'SOP', text: clip(top.content) };
  const text = blob.toLowerCase();
  if (WIRING_RE.test(text) || /leak|missing earth|venting|no earth/.test(text)) {
    return {
      verdict: 'fail',
      severity: 'high',
      citedClause,
      reason: clip(`Finding conflicts with ${citedClause.ref}: ${citedClause.text}`),
    };
  }
  if (/needs confirmation|incomplete|unclear|review/.test(text)) {
    return {
      verdict: 'review',
      severity: 'med',
      citedClause,
      reason: clip(`Evidence is incomplete against ${citedClause.ref}.`),
    };
  }
  return {
    verdict: 'pass',
    severity: 'low',
    citedClause,
    reason: clip(`Finding is consistent with ${citedClause.ref}.`),
  };
}

function normalize(parsed, fallback) {
  const verdict = VERDICTS.includes(parsed?.verdict) ? parsed.verdict : fallback.verdict;
  const severity = SEVERITIES.includes(parsed?.severity) ? parsed.severity : fallback.severity;
  const cited = parsed?.citedClause && typeof parsed.citedClause === 'object' ? parsed.citedClause : {};
  return {
    verdict,
    severity,
    citedClause: {
      ref: String(cited.ref || fallback.citedClause.ref).slice(0, 80),
      text: clip(cited.text || fallback.citedClause.text),
    },
    reason: clip(parsed?.reason || fallback.reason, 400),
  };
}

const SOP_MISS = 'The image data does not match any SOP in this rulebook';

export async function decideVerdict({ transcript, attributes, clauses }) {
  const blob = findingBlob({ transcript, attributes });
  const relevant = filterRelevantClauses(blob, clauses);
  if (!relevant.length) {
    throw new AppError(SOP_MISS, 422, 'SOP_NOT_MATCHED');
  }

  const fallback = heuristicVerdict(blob, relevant);
  if (!env.OPENAI_API_KEY) return fallback;

  const clauseBlock = relevant
    .slice(0, 6)
    .map((c, i) => `${i + 1}. ${c.clauseRef}: ${clip(c.content, 400)}`)
    .join('\n');

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OPENAI_VISION_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: `Judge this field inspection finding against the listed SOP clauses only.
Return JSON with:
- inScope: boolean — false if the finding is unrelated to every clause (wrong equipment, unrelated UI screenshot, topic not covered)
- verdict: pass | review | fail (only when inScope is true)
- severity: low | med | high
- citedClause: { ref, text } copied from one listed clause
- reason: short explanation

If inScope is false, still set reason explaining the mismatch. Do not invent a pass/fail against an unrelated clause.
If the finding is exposed, bare, broken, frayed, or damaged wiring and a wiring clause is listed, fail and cite that clause.

Finding: ${blob}

Clauses:
${clauseBlock}`,
          },
        ],
      }),
    });
  } catch (err) {
    throw new AppError(err.message || 'Compliance model unavailable', 503, 'UNAVAILABLE');
  }
  if (!res.ok) {
    const body = await res.text();
    throw new AppError(`Compliance failed (${res.status}): ${body.slice(0, 180)}`, 503, 'UNAVAILABLE');
  }
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (parsed && parsed.inScope === false) {
    throw new AppError(SOP_MISS, 422, 'SOP_NOT_MATCHED', {
      reason: clip(parsed.reason || SOP_MISS, 400),
    });
  }

  return normalize(parsed, fallback);
}
