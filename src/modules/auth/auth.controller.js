import { ok } from '../../lib/http.js';
import * as authService from './auth.service.js';

export async function login(req, res) {
  const data = await authService.login(req.body);
  return ok(res, data);
}

export async function refresh(req, res) {
  const data = await authService.refresh(req.body);
  return ok(res, data);
}

export async function logout(req, res) {
  await authService.logout(req.body);
  return ok(res, { loggedOut: true });
}

export async function me(req, res) {
  const data = await authService.me(req.user.id);
  return ok(res, data);
}
