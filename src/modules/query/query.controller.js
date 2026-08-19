import { ok } from '../../lib/http.js';
import * as queryService from './query.service.js';

export async function chat(req, res) {
  return ok(res, await queryService.chat(req.user, req.body));
}
