import { created, ok } from '../../lib/http.js';
import * as mediaService from './media.service.js';

export async function create(req, res) {
  const result = await mediaService.createMedia(
    req.user,
    { file: req.file, type: req.body.type, jobId: req.body.jobId || undefined },
    {
      idempotencyKey: req.header('idempotency-key') || undefined,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      baseUrl: mediaService.requestBaseUrl(req),
    },
  );
  return result.status === 201 ? created(res, result.data) : ok(res, result.data, result.status);
}

export async function getById(req, res) {
  return ok(res, await mediaService.getMedia(req.user, req.params.id, mediaService.requestBaseUrl(req)));
}

export async function file(req, res) {
  const result = await mediaService.streamLocalFile(req.params.id, req.query.exp, req.query.sig);
  if (result.redirect) return res.redirect(302, result.redirect);
  res.setHeader('Content-Type', result.mime);
  res.setHeader('Cache-Control', 'private, max-age=60');
  return res.send(result.buffer);
}
