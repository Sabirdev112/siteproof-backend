import { env } from '../config/env.js';
import { AppError } from '../lib/AppError.js';
import { extensionFor } from '../lib/mediaTypes.js';
import { WIRING_RE } from '../lib/wiring.js';

const ATTR_KEYS = ['object', 'condition', 'location', 'apparentIssue'];

const HINTS = [
  { re: WIRING_RE, object: 'cable', condition: 'exposed or damaged', apparentIssue: 'conductors not enclosed or wiring damaged' },
  { re: /earth|ground lug|bonding/i, object: 'earth lug', condition: 'loose or missing', apparentIssue: 'protective earth incomplete' },
  { re: /drain|condensate|overflow/i, object: 'condensate drain', condition: 'blocked or no fall', apparentIssue: 'drain not discharging safely' },
  { re: /leak|oil stain|refrigerant|flare/i, object: 'refrigerant joint', condition: 'leak suspected', apparentIssue: 'leak at flares or valves' },
  { re: /isolator|live|terminal cover/i, object: 'isolator', condition: 'cover missing', apparentIssue: 'outdoor terminals not enclosed' },
];

function emptyAttrs() {
  return { object: '', condition: '', location: '', apparentIssue: '' };
}

/** Soft keyword boost only when vision did not fill a field. Never invent AC defaults. */
function applySoftHints(text, attrs) {
  const out = { ...attrs };
  const blob = String(text || '');
  for (const hint of HINTS) {
    if (!hint.re.test(blob)) continue;
    if (!out.object) out.object = hint.object;
    if (!out.condition) out.condition = hint.condition;
    if (!out.apparentIssue) out.apparentIssue = hint.apparentIssue;
    break;
  }
  return out;
}

function parseJsonObject(raw) {
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeAttrs(input, base = emptyAttrs()) {
  const src = input && typeof input === 'object' ? input : {};
  const out = { ...base };
  for (const key of ATTR_KEYS) {
    const value = src[key];
    if (typeof value === 'string' && value.trim()) out[key] = value.trim().slice(0, 200);
  }
  return out;
}

export async function transcribeAudio({ buffer, mime, filename }) {
  if (!buffer?.length) return '';
  if (!env.OPENAI_API_KEY) return '';

  const safeName = filename || `note.${extensionFor(mime) || 'm4a'}`;
  const form = new FormData();
  // OpenAI Whisper needs a named file; Blob alone often yields empty text on Node.
  const file =
    typeof File !== 'undefined'
      ? new File([buffer], safeName, { type: mime || 'audio/mp4' })
      : new Blob([buffer], { type: mime || 'audio/mp4' });
  form.append('file', file, safeName);
  form.append('model', env.OPENAI_TRANSCRIBE_MODEL);

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form,
    });
  } catch (err) {
    throw new AppError(err.message || 'Transcription unavailable', 503, 'UNAVAILABLE');
  }
  if (!res.ok) {
    const body = await res.text();
    throw new AppError(`Transcription failed (${res.status}): ${body.slice(0, 180)}`, 503, 'UNAVAILABLE');
  }
  const json = await res.json();
  return String(json.text || '').trim();
}

/**
 * Describe what is in the photos for the worker to confirm.
 * Uses the job rulebook title as context — not a hardcoded HVAC prompt.
 */
export async function inspectPhotos({ photos, transcript, site, rulebookTitle }) {
  const base = {
    location: site || '',
    object: '',
    condition: '',
    apparentIssue: '',
  };

  const usable = photos.filter((photo) => photo.buffer?.length > 2048);
  if (!usable.length) {
    return {
      ...base,
      condition: 'needs confirmation',
      apparentIssue: 'no usable photo',
    };
  }

  if (!env.OPENAI_API_KEY) {
    return applySoftHints(`${transcript || ''} ${site || ''}`, {
      ...base,
      object: 'equipment',
      condition: 'needs confirmation',
      apparentIssue: 'confirm from photos (AI key not configured)',
    });
  }

  const book = rulebookTitle || 'the selected rulebook';
  const content = [
    {
      type: 'text',
      text: `You are SiteProof vision for a field inspection.
Rulebook in use: "${book}".
Return JSON only with keys: object, condition, location, apparentIssue, inScope (boolean).

Rules:
- Describe ONLY what is visible in the photo(s). Short phrases.
- Match terminology to this rulebook's domain when the photo clearly fits it.
- If the photo is blank, unrelated, a random object, a laptop UI, or does not show inspectable work for this rulebook, set inScope to false and put what you see in object/condition/apparentIssue (do not invent findings from the SOP).
- Never invent HVAC, wiring, battery, or other SOP topics that are not visible.
- Do not copy SOP clause text into the chips.
Site: ${site || 'unknown'}
Transcript: ${transcript || '(none)'}`,
    },
  ];
  for (const photo of usable.slice(0, 4)) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${photo.mime};base64,${photo.buffer.toString('base64')}` },
    });
  }

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
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (err) {
    throw new AppError(err.message || 'Vision unavailable', 503, 'UNAVAILABLE');
  }
  if (!res.ok) {
    const body = await res.text();
    throw new AppError(`Vision failed (${res.status}): ${body.slice(0, 180)}`, 503, 'UNAVAILABLE');
  }
  const json = await res.json();
  const parsed = parseJsonObject(json.choices?.[0]?.message?.content || '');
  const attrs = normalizeAttrs(parsed, base);
  const filled = applySoftHints(
    `${transcript || ''} ${attrs.object} ${attrs.condition} ${attrs.apparentIssue}`,
    attrs,
  );

  if (parsed && parsed.inScope === false) {
    throw new AppError(
      'The image data does not match any SOP in this rulebook',
      422,
      'SOP_NOT_MATCHED',
      { attributes: filled, transcript: transcript || '' },
    );
  }

  if (!filled.object && !filled.apparentIssue) {
    throw new AppError(
      'The image data does not match any SOP in this rulebook',
      422,
      'SOP_NOT_MATCHED',
    );
  }

  return filled;
}
