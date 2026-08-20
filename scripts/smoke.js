/**
 * Smoke-test live routes through Phase 9 against a running API (default localhost:3000).
 */
const BASE = (process.env.SMOKE_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const OWNER = { email: process.env.SEED_OWNER_EMAIL || 'owner@siteproof.local', password: process.env.SEED_OWNER_PASSWORD || 'Owner123!' };
const WORKER = { email: process.env.SEED_WORKER_EMAIL || 'worker@siteproof.local', password: process.env.SEED_WORKER_PASSWORD || 'Worker123!' };
const N8N_KEY = process.env.N8N_API_KEY || 'change-me-to-a-long-random-n8n-api-key';

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
  if (!json?.data) return json.error?.code || json.error?.details?.status || '';
  const d = json.data;
  if (d.items) return `items=${d.items.length}`;
  if (Array.isArray(d) && d[0]?.type) return `actions=${d.length}`;
  if (d.phase != null) return `phase=${d.phase} db=${d.db || ''} storage=${d.storage || ''}`;
  if (d.accessToken) return `role=${d.user?.role}`;
  if (d.verdict) return `verdict=${d.verdict}`;
  if (d.attributes) return `object=${d.attributes.object}`;
  if (d.findings) return `findings=${d.findings.length} status=${d.status}`;
  if (d.report) return `status=${d.status} report=${d.report.status}`;
  if (d.pdfStorageKey !== undefined) return `report=${d.status}`;
  if (d.today != null) return `today=${d.today} recent=${d.recentJobs?.length ?? 0}`;
  if (d.reply) return `citations=${d.citations?.length ?? 0}`;
  if (d.assignedTo !== undefined) return `issue=${d.status}`;
  if (d.id) return `id=${d.id}`;
  return 'ok';
}

const tinyJpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAD/EABQQAQAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAn//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AX//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/An//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2Q==',
  'base64',
);

/** Minimal silent WAV so media upload accepts type=audio. */
function tinyWav() {
  const samples = 1600;
  const dataSize = samples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(8000, 24);
  buf.writeUInt32LE(16000, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

function n8nHeaders(extra = {}) {
  return {
    'X-Api-Key': N8N_KEY,
    'X-SiteProof-Timestamp': String(Math.floor(Date.now() / 1000)),
    ...extra,
  };
}

async function login(account) {
  const { json } = await req('POST', '/auth/login', { body: account });
  return json.data?.accessToken;
}

async function main() {
  await req('GET', '/health', { expect: (s, j) => s === 200 && j.data?.phase === 9 });
  await req('GET', '/health/ready', { expect: (s, j) => s === 200 && j.data?.db === 'up' });
  await req('GET', '/me', { expect: (s, j) => s === 401 && j.error?.code === 'UNAUTHORIZED' });

  const workerToken = await login(WORKER);
  const ownerToken = await login(OWNER);
  if (!workerToken || !ownerToken) throw new Error('login failed');

  const { json: books } = await req('GET', '/rulebooks', { token: workerToken });
  const rulebookId = books.data?.items?.[0]?.id;

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

  // Tiny JPEG may be out-of-scope for the SOP — that is a valid extract outcome now.
  const { json: extracted } = await req('POST', '/extract', {
    token: workerToken,
    body: { jobId, mediaIds: [mediaId] },
    expect: (s, j) =>
      Boolean((s === 200 && j.data?.attributes) || (s === 422 && j.error?.code === 'SOP_NOT_MATCHED')),
  });
  const wiringAttrs = {
    object: 'cable',
    condition: 'exposed',
    location: 'isolator',
    apparentIssue: 'conductors not enclosed',
  };
  const wiringTranscript = 'exposed conductors at the outdoor isolator';
  const attrs = extracted.data?.attributes?.object ? extracted.data.attributes : wiringAttrs;
  const transcript =
    extracted.data?.transcript && String(extracted.data.transcript).trim()
      ? extracted.data.transcript
      : wiringTranscript;

  // Fix 1: voice note — upload audio, save finding with audioId + transcript, read back on job detail.
  const audioForm = new FormData();
  audioForm.append('type', 'audio');
  audioForm.append('jobId', jobId);
  audioForm.append('file', new Blob([tinyWav()], { type: 'audio/wav' }), 'smoke-note.wav');
  const { json: audioMedia } = await req('POST', '/media', {
    token: workerToken,
    form: audioForm,
    extraHeaders: { 'Idempotency-Key': crypto.randomUUID() },
    expect: (s, j) => Boolean(s === 201 && j.data?.type === 'audio' && j.data?.id),
  });
  const audioId = audioMedia.data?.id;

  await req('POST', '/extract', {
    token: workerToken,
    body: { jobId, mediaIds: [mediaId], audioId },
    expect: (s, j) =>
      Boolean(
        (s === 200 && typeof j.data?.transcript === 'string') ||
          (s === 422 && j.error?.code === 'SOP_NOT_MATCHED'),
      ),
  });

  // Fix 2: unrelated finding text must not invent a SOP verdict.
  await req('POST', '/compliance/check', {
    token: workerToken,
    body: {
      jobId,
      transcript: 'birthday cake with pink frosting and candles',
      attributes: {
        object: 'cake',
        condition: 'frosted',
        location: 'kitchen',
        apparentIssue: 'party dessert unrelated to install',
      },
    },
    expect: (s, j) => s === 422 && j.error?.code === 'SOP_NOT_MATCHED',
  });

  const { json: checked } = await req('POST', '/compliance/check', {
    token: workerToken,
    body: { jobId, transcript, attributes: attrs },
    expect: (s, j) => s === 200 && j.data?.verdict && j.data?.citedClause,
  });
  await req('POST', `/jobs/${jobId}/findings`, {
    token: workerToken,
    body: {
      mediaIds: [mediaId],
      audioId,
      transcript: 'voice note: exposed conductors at isolator need enclosure',
      attributes: attrs,
      verdict: checked.data.verdict,
      severity: checked.data.severity,
      citedClause: checked.data.citedClause,
      reason: checked.data.reason,
    },
    extraHeaders: { 'Idempotency-Key': crypto.randomUUID() },
    expect: (s, j) => s === 201 && j.data?.id,
  });

  await req('GET', `/jobs/${jobId}`, {
    token: workerToken,
    expect: (s, j) => {
      const f = j.data?.findings?.[0];
      return (
        s === 200 &&
        f &&
        typeof f.transcript === 'string' &&
        f.transcript.includes('exposed conductors') &&
        f.audioId === audioId &&
        typeof f.audioUrl === 'string' &&
        f.audioUrl.length > 0
      );
    },
  });

  const { json: closed } = await req('POST', `/jobs/${jobId}/close`, {
    token: workerToken,
    expect: (s, j) => s === 200 && j.data?.status === 'closed' && j.data?.report?.status === 'pending',
  });
  await req('POST', `/jobs/${jobId}/close`, {
    token: workerToken,
    expect: (s, j) => s === 409 && j.error?.code === 'CONFLICT',
  });

  const reportId = closed.data.report.id;
  await req('GET', `/reports/${reportId}`, {
    token: workerToken,
    expect: (s, j) => s === 200 && j.data?.status === 'pending',
  });

  await req('POST', '/webhooks/n8n/report-ready', {
    extraHeaders: n8nHeaders({ 'X-SiteProof-Timestamp': String(Math.floor(Date.now() / 1000) - 400) }),
    body: {
      reportId,
      jobId,
      status: 'ready',
      pdfStorageKey: `reports/${jobId}.pdf`,
    },
    expect: (s, j) => s === 401 && j.error?.code === 'UNAUTHORIZED',
  });
  await req('POST', '/webhooks/n8n/report-ready', {
    extraHeaders: n8nHeaders(),
    body: {
      reportId,
      jobId,
      status: 'ready',
      pdfStorageKey: `reports/${jobId}.pdf`,
      pdfUrl: 'https://example.com/report.pdf',
    },
  });
  await req('POST', '/webhooks/n8n/actions', {
    extraHeaders: n8nHeaders(),
    body: { jobId, type: 'report.pdf', target: 'storage', status: 'ok', metadata: { pdfStorageKey: `reports/${jobId}.pdf` } },
  });
  await req('GET', `/jobs/${jobId}`, {
    extraHeaders: { 'X-Api-Key': N8N_KEY },
    expect: (s, j) => s === 200 && j.data?.status === 'closed' && j.data?.report?.status === 'ready',
  });
  await req('GET', `/jobs/${jobId}/actions`, {
    token: ownerToken,
    expect: (s, j) => s === 200 && Array.isArray(j.data) && j.data.length >= 1,
  });
  await req('POST', `/jobs/${jobId}/findings`, {
    token: workerToken,
    body: {
      mediaIds: [mediaId],
      audioId,
      transcript: 'voice note: exposed conductors at isolator need enclosure',
      attributes: attrs,
      verdict: checked.data.verdict,
      severity: checked.data.severity,
      citedClause: checked.data.citedClause,
      reason: checked.data.reason,
    },
    extraHeaders: { 'Idempotency-Key': crypto.randomUUID() },
    expect: (s, j) => s === 409 && j.error?.code === 'CONFLICT',
  });

  await req('GET', '/dashboard/summary', { token: workerToken, expect: (s, j) => s === 403 && j.error?.code === 'FORBIDDEN' });
  const { json: summary } = await req('GET', '/dashboard/summary', {
    token: ownerToken,
    expect: (s, j) => s === 200 && typeof j.data?.today === 'number' && Array.isArray(j.data?.recentJobs),
  });
  await req('GET', `/jobs?headline=${summary.data.recentJobs[0]?.headline || 'fail'}`, {
    token: ownerToken,
    expect: (s, j) => s === 200 && Array.isArray(j.data?.items),
  });

  const { json: issues } = await req('GET', '/issues?status=open', {
    token: ownerToken,
    expect: (s, j) => s === 200 && Array.isArray(j.data?.items),
  });
  const issueId = issues.data.items[0]?.id;
  if (issueId) {
    const { json: me } = await req('GET', '/me', { token: ownerToken });
    await req('PATCH', `/issues/${issueId}`, {
      token: ownerToken,
      body: { status: 'assigned', assignedTo: me.data.id },
      expect: (s, j) => s === 200 && j.data?.status === 'assigned',
    });
    await req('PATCH', `/issues/${issueId}`, {
      token: ownerToken,
      body: { status: 'resolved' },
      expect: (s, j) => s === 200 && j.data?.status === 'resolved',
    });
  }

  await req('POST', '/query/chat', {
    token: ownerToken,
    body: { rulebookId, message: 'What does the SOP say about exposed conductors?' },
    expect: (s, j) => s === 200 && typeof j.data?.reply === 'string' && Array.isArray(j.data?.citations),
  });

  const loadStarted = Date.now();
  const loadPaths = ['/jobs?limit=20', '/issues?limit=20', '/dashboard/summary'];
  const loadRes = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      fetch(`${BASE}${loadPaths[i % 3]}`, { headers: { authorization: `Bearer ${ownerToken}` } }),
    ),
  );
  const loadMs = Date.now() - loadStarted;
  const loadOk = loadRes.every((r) => r.status === 200) && loadMs < 8000;
  results.push({ ok: loadOk, status: loadOk ? 200 : 500, method: 'GET', path: 'list-load x12', snippet: `ms=${loadMs}` });
  if (!loadOk) console.error('FAIL list load', loadMs, loadRes.map((r) => r.status));

  const failed = results.filter((r) => !r.ok);
  console.table(results.map(({ ok, status, method, path, snippet }) => ({ ok, status, method, path, snippet })));
  if (failed.length) {
    console.error(`${failed.length} check(s) failed`);
    process.exit(1);
  }
  console.log(`Phase 9 smoke passed (${results.length} checks) against ${BASE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
