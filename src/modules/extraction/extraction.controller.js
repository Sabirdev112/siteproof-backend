import { ok } from '../../lib/http.js';
import * as extractionService from './extraction.service.js';

export async function extract(req, res) {
  return ok(res, await extractionService.extractFinding(req.user, req.body));
}
