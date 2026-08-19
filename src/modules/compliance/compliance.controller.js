import { ok } from '../../lib/http.js';
import * as complianceService from './compliance.service.js';

export async function check(req, res) {
  return ok(res, await complianceService.checkCompliance(req.user, req.body));
}
