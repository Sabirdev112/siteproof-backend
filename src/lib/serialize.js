export function publicUser(user, org) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    org: {
      id: org.id,
      name: org.name,
    },
  };
}

export function publicOrg(org) {
  return {
    id: org.id,
    name: org.name,
    vertical: org.vertical,
    plan: org.plan,
    branding: org.branding ?? {},
    createdAt: org.created_at,
    updatedAt: org.updated_at,
  };
}

export function jobSummary(row) {
  const counts = {
    pass: Number(row.pass_count ?? 0),
    review: Number(row.review_count ?? 0),
    fail: Number(row.fail_count ?? 0),
  };
  return {
    id: row.id,
    site: row.site,
    jobType: row.job_type,
    rulebookId: row.rulebook_id,
    status: row.status,
    createdAt: row.created_at,
    closedAt: row.closed_at,
    workerId: row.worker_id,
    workerName: row.worker_name,
    findingCount: Number(row.finding_count ?? 0),
    headline: headlineFromCounts(counts),
    verdictSummary: counts,
  };
}

export function headlineFromCounts(counts) {
  if (counts.fail) return 'fail';
  if (counts.review) return 'review';
  if (counts.pass) return 'pass';
  return 'open';
}

export function serializeReport(row) {
  if (!row) return null;
  const key = row.pdf_storage_key || null;
  return {
    id: row.id,
    jobId: row.job_id,
    status: row.status,
    pdfStorageKey: key,
    pdfUrl: key && String(key).startsWith('http') ? key : null,
  };
}
