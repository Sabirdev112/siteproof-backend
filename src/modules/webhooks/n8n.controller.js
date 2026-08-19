import { created, ok } from '../../lib/http.js';
import * as n8nService from './n8n.service.js';

export async function reportReady(req, res) {
  return ok(res, await n8nService.reportReady(req.body));
}

export async function actions(req, res) {
  return created(res, await n8nService.logAction(req.body));
}
