import { ok } from '../../lib/http.js';
import { queues } from '../../queues/index.js';

export async function extract(req, res) {
  return ok(res, await queues.extraction.add({ user: req.user, body: req.body }));
}
