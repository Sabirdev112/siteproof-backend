import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { logger } from '../lib/logger.js';
import { pool } from './pool.js';
import { query, withTransaction } from './query.js';
import { AC_SOP } from '../data/acSop.js';
import { buildAcSopPdf } from '../data/generateAcSopPdf.js';
import { seedRulebookFromPdf } from '../modules/rulebooks/rulebooks.service.js';

const ROUNDS = 12;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

async function upsertUser(client, { orgId, email, password, name, role }) {
  const emailNormalized = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, ROUNDS);
  const result = await client.query(
    `INSERT INTO users (org_id, email, email_normalized, password_hash, name, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     ON CONFLICT (org_id, email_normalized)
     DO UPDATE SET
       email = EXCLUDED.email,
       password_hash = EXCLUDED.password_hash,
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       is_active = true
     RETURNING id, email, role`,
    [orgId, email, emailNormalized, passwordHash, name, role],
  );
  return result.rows[0];
}

export async function seed() {
  const orgName = process.env.SEED_ORG_NAME?.trim() || 'KeepCodeIn Solar';
  const accounts = [
    {
      role: 'owner',
      email: required('SEED_OWNER_EMAIL'),
      password: required('SEED_OWNER_PASSWORD'),
      name: process.env.SEED_OWNER_NAME?.trim() || 'SiteProof Owner',
    },
    {
      role: 'supervisor',
      email: required('SEED_SUPERVISOR_EMAIL'),
      password: required('SEED_SUPERVISOR_PASSWORD'),
      name: process.env.SEED_SUPERVISOR_NAME?.trim() || 'SiteProof Supervisor',
    },
    {
      role: 'worker',
      email: required('SEED_WORKER_EMAIL'),
      password: required('SEED_WORKER_PASSWORD'),
      name: process.env.SEED_WORKER_NAME?.trim() || 'SiteProof Worker',
    },
  ];

  const result = await withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT id FROM organizations WHERE name = $1 ORDER BY created_at ASC LIMIT 1`,
      [orgName],
    );
    let orgId = existing.rows[0]?.id;
    if (!orgId) {
      const created = await client.query(
        `INSERT INTO organizations (name, vertical, plan)
         VALUES ($1, 'solar', 'prototype')
         RETURNING id`,
        [orgName],
      );
      orgId = created.rows[0].id;
    }

    const users = [];
    for (const account of accounts) {
      users.push(await upsertUser(client, { orgId, ...account }));
    }
    return { orgId, orgName, users };
  });

  const rulebook = await seedAcSop(result.orgId);

  logger.info(
    {
      org: result.orgName,
      emails: result.users.map((user) => `${user.role}:${user.email}`),
      rulebook: { id: rulebook.id, status: rulebook.status, chunks: rulebook.chunkCount },
    },
    'seed complete',
  );
  return { ...result, rulebook };
}

async function seedAcSop(orgId) {
  const pdf = await buildAcSopPdf();
  const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, 'ac-sop.pdf'), pdf);

  const existing = await query(
    `SELECT r.id, r.status, COUNT(c.id)::int AS chunks
     FROM rulebooks r
     LEFT JOIN rulebook_chunks c ON c.rulebook_id = r.id
     WHERE r.org_id = $1 AND r.title = $2
     GROUP BY r.id
     LIMIT 1`,
    [orgId, AC_SOP.title],
  );
  logger.info({ id: existing.rows[0]?.id, replacing: Boolean(existing.rows[0]) }, 'ingesting ac sop');

  return seedRulebookFromPdf({
    orgId,
    title: AC_SOP.title,
    vertical: AC_SOP.vertical,
    filename: 'ac-sop.pdf',
    buffer: pdf,
    replace: true,
  });
}

const thisFile = path.normalize(fileURLToPath(import.meta.url));
const invoked = process.argv[1] && path.normalize(process.argv[1]) === thisFile;

if (invoked) {
  seed()
    .then(async () => {
      await pool.end();
    })
    .catch(async (error) => {
      logger.error({ err: error }, 'seed failed');
      await pool.end();
      process.exit(1);
    });
}
