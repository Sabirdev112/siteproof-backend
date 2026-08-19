import { ok } from '../../lib/http.js';
import * as dashboardService from './dashboard.service.js';

export async function summary(req, res) {
  return ok(res, await dashboardService.getSummary(req.user));
}
