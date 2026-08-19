import { env } from '../config/env.js';
import { query } from '../db/query.js';
import { logger } from '../lib/logger.js';
import { signPayload } from '../lib/crypto.js';

const MAX_ATTEMPTS = 8;

export async function enqueue(client, { id, eventType, aggregateId, payload }) {
  await client.query(
    `INSERT INTO event_outbox (id, event_type, aggregate_id, payload, status)
     VALUES ($1, $2, $3, $4::jsonb, 'pending')`,
    [id, eventType, aggregateId, JSON.stringify(payload)],
  );
}

async function mark(id, fields) {
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    params.push(value);
    sets.push(`${key} = $${params.length}`);
  }
  params.push(id);
  await query(`UPDATE event_outbox SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
}

async function deliver(row) {
  const url = env.N8N_WEBHOOK_URL;
  if (!url) {
    await mark(row.id, { status: 'delivered', delivered_at: new Date(), last_error: null });
    return;
  }

  const raw = JSON.stringify(row.payload);
  const ts = Math.floor(Date.now() / 1000);
  const sig = signPayload(env.WEBHOOK_SECRET, raw, ts);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-SiteProof-Event': row.event_type,
        'X-SiteProof-Delivery-Id': row.id,
        'X-SiteProof-Timestamp': String(ts),
        'X-SiteProof-Signature': `sha256=${sig}`,
      },
      body: raw,
    });
  } catch (err) {
    await retryOrFail(row, err.message || 'webhook unreachable');
    return;
  }

  if (res.ok) {
    await mark(row.id, { status: 'delivered', delivered_at: new Date(), last_error: null });
    return;
  }
  const body = await res.text();
  await retryOrFail(row, `HTTP ${res.status}: ${body.slice(0, 180)}`);
}

async function retryOrFail(row, error) {
  const attempts = Number(row.attempts) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await mark(row.id, { status: 'failed', attempts, last_error: error, next_attempt_at: new Date() });
    logger.error({ deliveryId: row.id, error }, 'outbox exhausted');
    return;
  }
  const delaySec = Math.min(300, 2 ** attempts);
  await mark(row.id, {
    status: 'pending',
    attempts,
    last_error: error,
    next_attempt_at: new Date(Date.now() + delaySec * 1000),
  });
  logger.warn({ deliveryId: row.id, attempts, error }, 'outbox retry scheduled');
}

export async function dispatchPending() {
  const result = await query(
    `SELECT * FROM event_outbox
     WHERE status = 'pending' AND next_attempt_at <= now()
     ORDER BY created_at ASC
     LIMIT 10`,
  );
  for (const row of result.rows) {
    await deliver(row);
  }
}

export function startOutboxLoop() {
  const tick = () => dispatchPending().catch((err) => logger.error({ err }, 'outbox dispatch failed'));
  setImmediate(tick);
  const timer = setInterval(tick, 4000);
  timer.unref();
  return timer;
}
