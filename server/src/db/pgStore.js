import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const mapRow = (r) => ({
  id: r.id,
  dedupeKey: r.dedupe_key,
  companyName: r.company_name,
  kvkNumber: r.kvk_number,
  branche: r.branche,
  province: r.province,
  city: r.city,
  phone: r.phone,
  email: r.email,
  website: r.website,
  hasWebsite: r.has_website,
  employees: r.employees,
  websiteScore: r.website_score,
  isOutdated: r.is_outdated,
  reason: r.reason,
  reasonTags: r.reason_tags || [],
  motivation: r.motivation,
  audit: r.audit || {},
  source: r.source,
  lastChecked: r.last_checked,
  createdAt: r.created_at,
});

export function createPgStore() {
  const pool = new pg.Pool({ connectionString: config.databaseUrl });

  function buildWhere(f = {}) {
    const clauses = [];
    const vals = [];
    const add = (sql, v) => { vals.push(v); clauses.push(sql.replace('$?', `$${vals.length}`)); };
    if (f.province) add('province = $?', f.province);
    if (f.city) add('LOWER(city) = LOWER($?)', f.city);
    if (f.branche) add('branche ILIKE $?', `%${f.branche}%`);
    if (f.employeesMin != null) add('employees >= $?', f.employeesMin);
    if (f.employeesMax != null) add('employees <= $?', f.employeesMax);
    if (f.onlyNoWebsite) clauses.push('has_website = FALSE');
    if (f.onlyOutdated) clauses.push('is_outdated = TRUE');
    if (f.minScore != null) add('website_score >= $?', f.minScore);
    if (f.maxScore != null) add('website_score <= $?', f.maxScore);
    return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', vals };
  }

  return {
    kind: 'postgres',
    async init() {
      await pool.query('SELECT 1');
      logger.info('Store: PostgreSQL verbonden.');
    },
    async hasDedupeKey(key) {
      const { rows } = await pool.query('SELECT 1 FROM leads WHERE dedupe_key = $1 LIMIT 1', [key]);
      return rows.length > 0;
    },
    async upsertLead(l) {
      const { rows } = await pool.query(
        `INSERT INTO leads
          (dedupe_key, company_name, kvk_number, branche, province, city, phone, email, website,
           has_website, employees, website_score, is_outdated, reason, reason_tags, motivation, audit, source, last_checked)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now())
         ON CONFLICT (dedupe_key) DO UPDATE SET last_checked = now()
         RETURNING (xmax = 0) AS inserted`,
        [
          l.dedupeKey, l.companyName, l.kvkNumber || null, l.branche || null, l.province || null,
          l.city || null, l.phone || null, l.email || null, l.website || null, !!l.hasWebsite,
          l.employees ?? null, l.websiteScore ?? null, !!l.isOutdated, l.reason || null,
          l.reasonTags || [], l.motivation || null, JSON.stringify(l.audit || {}), l.source || null,
        ]
      );
      return { inserted: rows[0]?.inserted === true };
    },
    async listLeads(filters = {}) {
      const { where, vals } = buildWhere(filters);
      const limit = filters.limit || 500;
      const { rows } = await pool.query(
        `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT ${Number(limit)}`,
        vals
      );
      return rows.map(mapRow);
    },
    async stats() {
      const t = config.scoreThreshold;
      const { rows } = await pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS new_today,
           COUNT(*) FILTER (WHERE has_website = FALSE)::int AS without_website,
           COUNT(*) FILTER (WHERE has_website = TRUE AND website_score < $1)::int AS poor_website,
           COALESCE(ROUND(AVG(website_score) FILTER (WHERE has_website = TRUE)), 0)::int AS avg_score
         FROM leads`,
        [t]
      );
      const r = rows[0];
      return {
        total: r.total, newToday: r.new_today, withoutWebsite: r.without_website,
        poorWebsite: r.poor_website, avgScore: r.avg_score,
      };
    },
    async createRun({ target, filters }) {
      const { rows } = await pool.query(
        `INSERT INTO generation_runs (status, target, filters) VALUES ('pending', $1, $2) RETURNING id`,
        [target, JSON.stringify(filters || {})]
      );
      return rows[0].id;
    },
    async getRun(id) {
      const { rows } = await pool.query('SELECT * FROM generation_runs WHERE id = $1', [id]);
      if (!rows[0]) return null;
      const r = rows[0];
      return { id: r.id, status: r.status, target: r.target, found: r.found, scanned: r.scanned, filters: r.filters, error: r.error, createdAt: r.created_at, finishedAt: r.finished_at };
    },
    async updateRun(id, patch) {
      const cols = [];
      const vals = [];
      for (const [k, v] of Object.entries(patch)) {
        const col = { found: 'found', scanned: 'scanned', status: 'status', error: 'error', finishedAt: 'finished_at' }[k];
        if (!col) continue;
        vals.push(v);
        cols.push(`${col} = $${vals.length}`);
      }
      if (!cols.length) return;
      vals.push(id);
      await pool.query(`UPDATE generation_runs SET ${cols.join(', ')} WHERE id = $${vals.length}`, vals);
    },
    async close() {
      await pool.end();
    },
  };
}
