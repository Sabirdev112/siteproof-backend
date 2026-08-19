import { ok } from '../../lib/http.js';
import * as reportsService from './reports.service.js';

export async function getById(req, res) {
  return ok(res, await reportsService.getReport(req.user, req.params.id, { n8n: req.n8n }));
}

export async function patch(req, res) {
  return ok(res, await reportsService.patchReport(req.params.id, req.body));
}
