import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { config, usePostgres } from '../config.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  if (!usePostgres) {
    logger.warn('Geen DATABASE_URL ingesteld — de app gebruikt in-memory opslag. Migratie niet nodig.');
    return;
  }
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  try {
    await pool.query(sql);
    logger.info('Migratie voltooid: tabellen aangemaakt/bijgewerkt.');
  } catch (err) {
    logger.error('Migratie mislukt:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
