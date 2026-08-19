/**
 * Smoke-test live routes through Phase 5 against a running API (default localhost:3000).
 */
const BASE = (process.env.SMOKE_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const OWNER = { email: process.env.SEED_OWNER_EMAIL || 'owner@siteproof.local', password: process.env.SEED_OWNER_PASSWORD || 'Owner123!' };
const WORKER = { email: process.env.SEED_WORKER_EMAIL || 'worker@siteproof.local', password: process.env.SEED_WORKER_PASSWORD || 'Worker123!' };

const results = [];

async function req(method, path, { token, body, form, expect, extraHeaders } = {}) {
  const headers = { ...extraHeaders, ...(token ? { authorization: `Bearer ${token}` } : {}) };
  let payload;
  if (form) {
    payload = { method, headers, body: form };
  } else if (body) {
    headers['content-type'] = 'application/json';
    payload = { method, headers, body: JSON.stringify(body) };
  } else {
    payload = { method, headers };
  }
  const res = await fetch(`${BASE}${path}`, payload);
  const json = await res.json().catch(() => ({}));
  const ok = expect ? expect(res.status, json) : res.ok && json.success !== false;
  results.push({ ok, status: res.status, method, path, code: json.error?.code, snippet: summarize(json) });
  if (!ok) {
    console.error('FAIL', method, path, res.status, json.error || json);
  }
  return { res, json };
}

function summarize(json) {
  if (!json?.data) return json.error?.code || '';
  const d = json.data;
  if (d.items) return `items=${d.items.length}`;
  if (d.phase != null) return `phase=${d.phase} db=${d.db || ''} storage=${d.storage || ''}`;
  if (d.accessToken) return `role=${d.user?.role}`;
  if (d.attributes) return `object=${d.attributes.object}`;
  if (d.status) return `status=${d.status}`;
  if (d.id) return `id=${d.id}`;
  return 'ok';
}

const tinyJpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAD/EABQQAQAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAn//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AX//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/An//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2Q==',
  'base64',
);

async function login(account) {
  const { json } = await req('POST', '/auth/login', { body: account });
  return json.data?.accessToken;
}

async function main() {
  await req('GET', '/health', { expect: (s, j) => s === 200 && j.data?.phase === 5 });
  await req('GET', '/health/ready', { expect: (s, j) => s === 200 && j.data?.db === 'up' });

  await req('GET', '/me', { expect: (s, j) => s === 401 && j.error?.code === 'UNAUTHORIZED' });

  const workerToken = await login(WORKER);
  const ownerToken = await login(OWNER);
  if (!workerToken || !ownerToken) throw new Error('login failed');

  await req('GET', '/me', { token: workerToken });
  await req('GET', '/orgs/me', { token: workerToken });
  await req('GET', '/settings', { token: workerToken });

  const { json: books } = await req('GET', '/rulebooks', { token: workerToken });
  const rulebookId = books.data?.items?.[0]?.id;
  if (!rulebookId) throw new Error('no seeded rulebook');

  await req('POST', '/rulebooks', {
    token: workerToken,
    body: { title: 'should-fail' },
    expect: (s, j) => s === 403 && j.error?.code === 'FORBIDDEN',
  });

  await req('GET', `/rulebooks/${rulebookId}`, { token: workerToken });
  await req('GET', `/rulebooks/${rulebookId}/status`, { token: ownerToken });
  await req('GET', `/rulebooks/${rulebookId}/search?q=exposed%20conductors`, { token: ownerToken });

  const { json: job } = await req('POST', '/jobs', {
    token: workerToken,
    body: { site: 'Outdoor unit, exposed conductors at isolator', jobType: 'ac_install_inspection', rulebookId },
    extraHeaders: { 'Idempotency-Key': crypto.randomUUID() },
  });
  const jobId = job.data?.id;
  await req('GET', '/jobs?status=open', { token: workerToken });
  if (jobId) await req('GET', `/jobs/${jobId}`, { token: workerToken });

  const form = new FormData();
  form.append('type', 'photo');
  if (jobId) form.append('jobId', jobId);
  form.append('file', new Blob([tinyJpeg], { type: 'image/jpeg' }), 'smoke.jpg');
  const { json: media } = await req('POST', '/media', {
    token: workerToken,
    form,
    extraHeaders: { 'Idempotency-Key': crypto.randomUUID() },
  });
  const mediaId = media.data?.id;

  await req('POST', '/extract', {
    token: workerToken,
    body: { jobId, mediaIds: [] },
    expect: (s, j) => s === 400 && j.error?.code === 'VALIDATION_ERROR',
  });
  await req('POST', '/extract', {
    token: workerToken,
    body: { jobId, mediaIds: [mediaId] },
    expect: (s, j) =>
      s === 200 &&
      j.data?.attributes?.object &&
      'condition' in j.data.attributes &&
      'location' in j.data.attributes &&
      'apparentIssue' in j.data.attributes,
  });

  await req('POST', '/compliance/check', {
    token: ownerToken,
    body: {},
    expect: (s, j) => s === 400 || s === 501,
  });

  const failed = results.filter((r) => !r.ok);
  console.table(results.map(({ ok, status, method, path, snippet }) => ({ ok, status, method, path, snippet })));
  if (failed.length) {
    console.error(`${failed.length} check(s) failed`);
    process.exit(1);
  }
  console.log(`Phase 5 smoke passed (${results.length} checks) against ${BASE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
