import { created, ok, paginated, parsePagination } from '../../lib/http.js';
import * as jobsService from './jobs.service.js';

export async function create(req, res) {
  const result = await jobsService.createJob(req.user, req.body, {
    idempotencyKey: req.header('idempotency-key') || undefined,
    method: req.method,
    path: req.originalUrl.split('?')[0],
  });
  return result.status === 201 ? created(res, result.data) : ok(res, result.data, result.status);
}

export async function list(req, res) {
  const pagination = parsePagination(req.query);
  const data = await jobsService.listJobs(req.user, req.query, pagination);
  return paginated(res, data.items, data);
}

export async function getById(req, res) {
  return ok(res, await jobsService.getJob(req.user, req.params.id));
}
