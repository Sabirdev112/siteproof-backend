import { timingSafeEqual } from 'node:crypto';
import swaggerUi from 'swagger-ui-express';
import { env, isProd } from '../config/env.js';
import { openApiDocument } from './openapi.js';

function unauthorized(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="SiteProof API Docs"');
  return res.status(401).send('Authentication required');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * HTTP Basic Auth using DOCS_USERS (`user:pass,user2:pass2`).
 * - Users set → login required
 * - Empty + production → docs disabled (404)
 * - Empty + development → open (no login)
 */
export function docsBasicAuth(req, res, next) {
  const users = env.DOCS_USERS;
  if (!users.length) {
    if (isProd) return res.status(404).end();
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Basic ')) return unauthorized(res);

  let decoded;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return unauthorized(res);
  }

  const sep = decoded.indexOf(':');
  if (sep < 0) return unauthorized(res);

  const username = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);
  const match = users.find((u) => safeEqual(u.username, username) && safeEqual(u.password, password));
  if (!match) return unauthorized(res);

  req.docsUser = match.username;
  return next();
}

/**
 * Mount OpenAPI JSON + Swagger UI.
 * - GET /docs          → Swagger UI
 * - GET /docs/openapi.json → raw OpenAPI 3 document
 */
export function mountSwagger(app) {
  app.get('/docs/openapi.json', docsBasicAuth, (_req, res) => {
    res.json(openApiDocument);
  });

  app.use(
    '/docs',
    docsBasicAuth,
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'SiteProof API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        tryItOutEnabled: true,
        url: '/docs/openapi.json',
      },
    }),
  );
}

export { openApiDocument };
