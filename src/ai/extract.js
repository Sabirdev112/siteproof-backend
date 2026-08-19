import { env } from '../config/env.js';
import { AppError } from '../lib/AppError.js';
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

function pickHints(text, base) {
  const attrs = { ...emptyAttrs(), ...base };
  const blob = String(text || '');
  for (const hint of HINTS) {
    if (hint.re.test(blob)) {
      attrs.object = hint.object;
      attrs.condition = hint.condition;
      attrs.apparentIssue = hint.apparentIssue;
      break;
    }
  }
  return attrs;
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

function normalizeAttrs(input, fallback) {
  const src = input && typeof input === 'object' ? input : {};
  const out = { ...fallback };
  for (const key of ATTR_KEYS) {
    const value = src[key];
    if (typeof value === 'string' && value.trim()) out[key] = value.trim().slice(0, 200);
  }
  return out;
}

export async function transcribeAudio({ buffer, mime, filename }) {
  if (!buffer?.length) return '';
  if (!env.OPENAI_API_KEY) return '';

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime || 'audio/mpeg' }), filename || 'note.m4a');
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

export async function inspectPhotos({ photos, transcript, site }) {
  const fallback = pickHints(`${transcript || ''} ${site || ''}`, {
    location: site || 'site',
    object: 'ac unit',
    condition: 'needs confirmation',
    apparentIssue: 'confirm from photos',
  });

  const usable = photos.filter((photo) => photo.buffer?.length > 2048);
  if (!env.OPENAI_API_KEY || !usable.length) return fallback;

  const content = [
    {
      type: 'text',
      text: `You inspect HVAC / air-conditioner install photos for SiteProof.
Return JSON only with keys object, condition, location, apparentIssue (short phrases).
Look closely at cables, terminals, isolators, and insulation.
If you see exposed, bare, broken, cut, frayed, nicked, or damaged wires, set object to "cable", condition to "exposed" or "damaged", and apparentIssue to "conductors not enclosed" or "broken wiring".
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
    if (res.status === 400) return fallback;
    throw new AppError(`Vision failed (${res.status}): ${body.slice(0, 180)}`, 503, 'UNAVAILABLE');
  }
  const json = await res.json();
  const fromVision = normalizeAttrs(parseJsonObject(json.choices?.[0]?.message?.content || ''), fallback);
  return pickHints(
    `${transcript || ''} ${fromVision.object} ${fromVision.condition} ${fromVision.apparentIssue}`,
    fromVision,
  );
}
