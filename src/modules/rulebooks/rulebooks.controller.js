import { created, ok } from '../../lib/http.js';
import * as rulebooksService from './rulebooks.service.js';

export async function list(req, res) {
  return ok(res, await rulebooksService.listRulebooks(req.user));
}

export async function create(req, res) {
  return created(res, await rulebooksService.createRulebook(req.user, req.body));
}

export async function getById(req, res) {
  return ok(res, await rulebooksService.getRulebook(req.user, req.params.id));
}

export async function status(req, res) {
  return ok(res, await rulebooksService.getStatus(req.user, req.params.id));
}

export async function upload(req, res) {
  return created(res, await rulebooksService.addDocument(req.user, req.params.id, req.file));
}

export async function removeDocument(req, res) {
  return ok(res, await rulebooksService.deleteDocument(req.user, req.params.id, req.params.documentId));
}

export async function search(req, res) {
  return ok(res, await rulebooksService.searchChunks(req.user, req.params.id, req.query.q, req.query.limit));
}
