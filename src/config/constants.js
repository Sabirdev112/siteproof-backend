export const ROLES = Object.freeze(['worker', 'supervisor', 'owner']);
export const JOB_STATUSES = Object.freeze(['open', 'closed']);
export const VERDICTS = Object.freeze(['pass', 'review', 'fail']);
export const SEVERITIES = Object.freeze(['low', 'med', 'high']);
export const MEDIA_TYPES = Object.freeze(['photo', 'audio']);
export const EVENT_TYPES = Object.freeze(['job.closed', 'finding.failed']);

/**
 * Role → permission map. Used from Phase 1 onward.
 * worker: capture + close own jobs
 * supervisor/owner: rulebooks, all jobs, admin dashboard
 */
export const PERMISSIONS = Object.freeze({
  'jobs:create': ['worker', 'supervisor', 'owner'],
  'jobs:read:own': ['worker', 'supervisor', 'owner'],
  'jobs:read:all': ['supervisor', 'owner'],
  'jobs:close': ['worker', 'supervisor', 'owner'],
  'rulebooks:read': ['worker', 'supervisor', 'owner'],
  'rulebooks:write': ['supervisor', 'owner'],
  'org:read': ['worker', 'supervisor', 'owner'],
  'org:write': ['owner'],
  'team:invite': ['supervisor', 'owner'],
  'dashboard:read': ['supervisor', 'owner'],
  'issues:manage': ['supervisor', 'owner'],
  'settings:read': ['worker', 'supervisor', 'owner'],
  'settings:write': ['owner'],
});

export const API_PHASE = 4;
export const EMBEDDING_DIM = 1536;
