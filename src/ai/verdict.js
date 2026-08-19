import { env } from '../config/env.js';
import { AppError } from '../lib/AppError.js';
import { VERDICTS, SEVERITIES } from '../config/constants.js';

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

function heuristicVerdict(blob, clauses) {
  const top = clauses[0];
  const citedClause = { ref: top.clauseRef || 'SOP', text: clip(top.content) };
  const text = blob.toLowerCase();
  if (/exposed|bare|unsheath|not enclosed|leak|missing earth|venting|no earth/.test(text)) {
    return {
      verdict: 'fail',
      severity: 'high',
      citedClause,
      reason: clip(`${blob} conflicts with ${citedClause.ref}.`),
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

export async function decideVerdict({ transcript, attributes, clauses }) {
  const blob = findingBlob({ transcript, attributes });
  const fallback = heuristicVerdict(blob, clauses);
  if (!env.OPENAI_API_KEY) return fallback;

  const clauseBlock = clauses
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
            content: `Judge this HVAC inspection finding against SOP clauses.
Verdict must be pass, review, or fail. Severity low, med, or high.
Return JSON: verdict, severity, citedClause: { ref, text }, reason.
Use one cited clause from the list (copy ref and a short quote).

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
  return normalize(parsed, fallback);
}
