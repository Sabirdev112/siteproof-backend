import { ok } from '../../lib/http.js';
import * as orgsService from './orgs.service.js';

export async function getMine(req, res) {
  return ok(res, await orgsService.getMine(req.user.org_id));
}

export async function updateMine(req, res) {
  return ok(res, await orgsService.updateMine(req.user.org_id, req.body));
}

export async function getSettings(req, res) {
  return ok(res, await orgsService.getSettings(req.user.org_id));
}

export async function updateSettings(req, res) {
  return ok(res, await orgsService.updateSettings(req.user.org_id, req.body));
}
