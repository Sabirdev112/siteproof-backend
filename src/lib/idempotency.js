import { query } from '../db/query.js';

const TTL_HOURS = 24;

export async function findIdempotentResponse(userId, key) {
  const result = await query(
    `SELECT response_status, response_body
     FROM idempotency_keys
     WHERE user_id = $1 AND key = $2 AND expires_at > now()`,
    [userId, key],
  );
  return result.rows[0] ?? null;
}

export async function saveIdempotentResponse(client, { userId, key, method, path, status, body }) {
  await client.query(
    `INSERT INTO idempotency_keys (
       key, user_id, method, path, response_status, response_body, expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, now() + interval '${TTL_HOURS} hours')
     ON CONFLICT (user_id, key) DO NOTHING`,
    [key, userId, method, path, status, body],
  );
}
