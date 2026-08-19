/**
 * Smoke-test live routes through Phase 6 against a running API (default localhost:3000).
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
  if (d.verdict) return `verdict=${d.verdict}`;
  if (d.attributes) return `object=${d.attributes.object}`;
  if (d.findings) return `findings=${d.findings.length}`;
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
  await req('GET', '/health', { expect: (s, j) => s === 200 && j.data?.phase === 6 });
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
  await req('GET', `/rulebooks/${rulebookId}/search?q=exposed%20conductors`, { token: ownerToken });

  const { json: job } = await req('POST', '/jobs', {
    token: workerToken,
    body: { site: 'Outdoor unit, exposed conductors at isolator', jobType: 'ac_install_inspection', rulebookId },
    extraHeaders: { 'Idempotency-Key': crypto.randomUUID() },
  });
  const jobId = job.data?.id;

  const form = new FormData();
  form.append('type', 'photo');
  form.append('jobId', jobId);
  form.append('file', new Blob([tinyJpeg], { type: 'image/jpeg' }), 'smoke.jpg');
  const { json: media } = await req('POST', '/media', {
    token: workerToken,
    form,
    extraHeaders: { 'Idempotency-Key': crypto.randomUUID() },
  });
  const mediaId = media.data?.id;

  const { json: extracted } = await req('POST', '/extract', {
    token: workerToken,
    body: { jobId, mediaIds: [mediaId] },
    expect: (s, j) => Boolean(s === 200 && j.data?.attributes?.object),
  });

  await req('POST', '/compliance/check', {
    token: workerToken,
    body: {},
    expect: (s, j) => s === 400 && j.error?.code === 'VALIDATION_ERROR',
  });

  const { json: checked } = await req('POST', '/compliance/check', {
    token: workerToken,
    body: {
      jobId,
      transcript: extracted.data.transcript,
      attributes: extracted.data.attributes,
    },
    expect: (s, j) =>
      Boolean(
        s === 200 &&
          ['pass', 'review', 'fail'].includes(j.data?.verdict) &&
          j.data?.citedClause?.ref &&
          j.data?.citedClause?.text &&
          j.data?.reason,
      ),
  });

  const findingKey = crypto.randomUUID();
  const findingBody = {
    mediaIds: [mediaId],
    transcript: extracted.data.transcript,
    attributes: extracted.data.attributes,
    verdict: checked.data.verdict,
    severity: checked.data.severity,
    citedClause: checked.data.citedClause,
    reason: checked.data.reason,
  };
  await req('POST', `/jobs/${jobId}/findings`, {
    token: workerToken,
    body: findingBody,
    extraHeaders: { 'Idempotency-Key': findingKey },
    expect: (s, j) => s === 201 && j.data?.id && j.data?.verdict === checked.data.verdict,
  });
  await req('POST', `/jobs/${jobId}/findings`, {
    token: workerToken,
    body: findingBody,
    extraHeaders: { 'Idempotency-Key': findingKey },
    expect: (s, j) => (s === 200 || s === 201) && j.data?.verdict === checked.data.verdict,
  });
  await req('GET', `/jobs/${jobId}`, {
    token: workerToken,
    expect: (s, j) =>
      Boolean(s === 200 && j.data?.findings?.length >= 1 && j.data.findings[0].citedClause?.ref),
  });
  await req('POST', `/jobs/${jobId}/close`, {
    token: workerToken,
    expect: (s, j) => s === 501 && j.error?.code === 'NOT_IMPLEMENTED',
  });

  const failed = results.filter((r) => !r.ok);
  console.table(results.map(({ ok, status, method, path, snippet }) => ({ ok, status, method, path, snippet })));
  if (failed.length) {
    console.error(`${failed.length} check(s) failed`);
    process.exit(1);
  }
  console.log(`Phase 6 smoke passed (${results.length} checks) against ${BASE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
