import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (env.SKIP_PGVECTOR && file.includes('pgvector')) {
      logger.warn({ file }, 'skipping pgvector migration (SKIP_PGVECTOR=true)');
      continue;
    }

    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE id = $1', [file]);
    if (applied.rowCount) continue;

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info({ file }, 'migration applied');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ err: error, file }, 'migration failed');
      throw error;
    } finally {
      client.release();
    }
  }
}

const isCli = process.argv[1] && path.normalize(process.argv[1]).endsWith(`${path.sep}migrate.js`);

if (isCli) {
  migrate()
    .then(async () => {
      logger.info('migrations complete');
      await pool.end();
    })
    .catch(async (error) => {
      logger.error({ err: error }, 'migrations failed');
      await pool.end();
      process.exit(1);
    });
}
