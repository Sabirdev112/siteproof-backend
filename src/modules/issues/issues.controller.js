import { ok, paginated, parsePagination } from '../../lib/http.js';
import * as issuesService from './issues.service.js';

export async function list(req, res) {
  const pagination = parsePagination(req.query);
  const data = await issuesService.listIssues(req.user, req.query, pagination);
  return paginated(res, data.items, data);
}

export async function patch(req, res) {
  return ok(res, await issuesService.patchIssue(req.user, req.params.id, req.body));
}
