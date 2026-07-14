import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { scoreLabel } from '../services/analysis/leadScore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  status: r.status || 'nieuw',
  note: r.note || '',
  analysisStatus: r.analysis_status || 'nvt',
  analysisAttempts: r.analysis_attempts || 0,
  analyzedAt: r.analyzed_at,
  pagespeed: r.pagespeed || {},
  checks: r.checks || {},
  talkingPoints: r.talking_points || [],
  positiveNote: r.positive_note || '',
  openingLine: r.opening_line || '',
  leadScore: r.lead_score,
  confidence: r.confidence,
  label: scoreLabel(r.lead_score, r.confidence),
  followUpDate: r.follow_up_date,
  favorite: r.favorite || false,
  contactPerson: r.contact_person || '',
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
    const add = (sql, v) => { vals.push(v); clauses.push(sql.replace(/\$\?/g, `$${vals.length}`)); };
    if (f.province) add('province = $?', f.province);
    if (f.city) add('LOWER(city) = LOWER($?)', f.city);
    if (f.branche) add('branche ILIKE $?', `%${f.branche}%`);
    if (f.employeesMin != null) add('employees >= $?', f.employeesMin);
    if (f.employeesMax != null) add('employees <= $?', f.employeesMax);
    if (f.onlyNoWebsite) clauses.push('has_website = FALSE');
    if (f.hasWebsite) clauses.push('has_website = TRUE');
    if (f.onlyOutdated) clauses.push('is_outdated = TRUE');
    if (f.onlyEmail) clauses.push("email IS NOT NULL AND email <> ''");
    if (f.hasPhone) clauses.push("phone IS NOT NULL AND phone <> ''");
    if (f.favorite) clauses.push('favorite = TRUE');
    if (f.analysisDone) clauses.push("analysis_status = 'voltooid'");
    if (f.status) add('status = $?', f.status);
    if (f.minScore != null) add('website_score >= $?', f.minScore);
    if (f.maxScore != null) add('website_score <= $?', f.maxScore);
    if (f.minLeadScore != null) add('lead_score >= $?', f.minLeadScore);
    if (f.maxPageSpeed != null) add("(pagespeed->>'performance')::int <= $?", f.maxPageSpeed);
    if (f.q) add("(company_name ILIKE $? OR city ILIKE $? OR website ILIKE $? OR phone ILIKE $? OR email ILIKE $?)", `%${f.q}%`);
    return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', vals };
  }

  const ORDER = {
    leadscore: 'lead_score DESC NULLS LAST, created_at DESC',
    worst: 'has_website ASC, website_score ASC NULLS FIRST, created_at DESC',
    pagespeed: "(pagespeed->>'performance')::int ASC NULLS LAST, created_at DESC",
    seo: "(pagespeed->>'seo')::int ASC NULLS LAST, created_at DESC",
    recent: 'created_at DESC',
    checked: 'analyzed_at DESC NULLS LAST',
    name: 'company_name ASC',
  };

  return {
    kind: 'postgres',
    async init() {
      const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
      await pool.query(sql);
      logger.info('Store: PostgreSQL verbonden en schema gecontroleerd.');
    },
    async hasDedupeKey(key) {
      const { rows } = await pool.query('SELECT 1 FROM leads WHERE dedupe_key = $1 LIMIT 1', [key]);
      return rows.length > 0;
    },
    async upsertLead(l) {
      const { rows } = await pool.query(
        `INSERT INTO leads
          (dedupe_key, company_name, kvk_number, branche, province, city, phone, email, website,
           has_website, employees, website_score, is_outdated, reason, reason_tags, motivation, audit, source,
           analysis_status, lead_score, confidence, last_checked)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21, now())
         ON CONFLICT (dedupe_key) DO UPDATE SET last_checked = now()
         RETURNING (xmax = 0) AS inserted`,
        [
          l.dedupeKey, l.companyName, l.kvkNumber || null, l.branche || null, l.province || null,
          l.city || null, l.phone || null, l.email || null, l.website || null, !!l.hasWebsite,
          l.employees ?? null, l.websiteScore ?? null, !!l.isOutdated, l.reason || null,
          l.reasonTags || [], l.motivation || null, JSON.stringify(l.audit || {}), l.source || null,
          l.analysisStatus || (l.hasWebsite ? 'wacht' : 'nvt'), l.leadScore ?? null, l.confidence ?? null,
        ]
      );
      return { inserted: rows[0]?.inserted === true };
    },
    async updateLead(id, patch) {
      const map = {
        status: 'status', note: 'note', favorite: 'favorite',
        followUpDate: 'follow_up_date', contactPerson: 'contact_person', website: 'website',
      };
      const cols = [];
      const vals = [];
      for (const [k, col] of Object.entries(map)) {
        if (patch[k] !== undefined) { vals.push(patch[k]); cols.push(`${col} = $${vals.length}`); }
      }
      if (!cols.length) { const { rows } = await pool.query('SELECT * FROM leads WHERE id=$1', [id]); return rows[0] ? mapRow(rows[0]) : null; }
      vals.push(id);
      const { rows } = await pool.query(`UPDATE leads SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async deleteLead(id) {
      const { rowCount } = await pool.query('DELETE FROM leads WHERE id = $1', [id]);
      return rowCount;
    },
    async listLeads(filters = {}) {
      const { where, vals } = buildWhere(filters);
      const limit = filters.limit || 500;
      const order = ORDER[filters.sort] || ORDER.leadscore;
      const { rows } = await pool.query(`SELECT * FROM leads ${where} ORDER BY ${order} LIMIT ${Number(limit)}`, vals);
      return rows.map(mapRow);
    },
    async stats() {
      const t = config.scoreThreshold;
      const { rows } = await pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS new_today,
           COUNT(*) FILTER (WHERE has_website = FALSE)::int AS without_website,
           COUNT(*) FILTER (WHERE has_website = TRUE)::int AS with_website,
           COUNT(*) FILTER (WHERE analysis_status = 'voltooid')::int AS analyzed,
           COUNT(*) FILTER (WHERE analysis_status IN ('wacht','bezig'))::int AS analysis_pending,
           COUNT(*) FILTER (WHERE lead_score >= 75)::int AS hot,
           COALESCE(ROUND(AVG(lead_score)), 0)::int AS avg_lead_score
         FROM leads`,
        []
      );
      const r = rows[0];
      return {
        total: r.total, newToday: r.new_today, withoutWebsite: r.without_website, withWebsite: r.with_website,
        analyzed: r.analyzed, analysisPending: r.analysis_pending, hot: r.hot, avgLeadScore: r.avg_lead_score,
        poorWebsite: r.with_website, avgScore: r.avg_lead_score, scoreThreshold: t,
      };
    },
    // ── Analyse-queue ──
    async claimNextAnalysis(maxAttempts) {
      const { rows } = await pool.query(
        `UPDATE leads SET analysis_status='bezig'
         WHERE id = (
           SELECT id FROM leads
           WHERE has_website = TRUE AND website IS NOT NULL
             AND analysis_status IN ('wacht','mislukt') AND analysis_attempts < $1
           ORDER BY (analysis_status='wacht') DESC, created_at ASC
           LIMIT 1 FOR UPDATE SKIP LOCKED
         )
         RETURNING *`, [maxAttempts]);
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async saveAnalysis(id, d) {
      const { rows } = await pool.query(
        `UPDATE leads SET
           pagespeed=$2, checks=$3, lead_score=$4, confidence=$5,
           talking_points=$6, positive_note=$7, opening_line=$8, is_outdated=$9,
           analysis_status='voltooid', analyzed_at=now(), analysis_attempts=analysis_attempts+1
         WHERE id=$1 RETURNING *`,
        [id, JSON.stringify(d.pagespeed || {}), JSON.stringify(d.checks || {}), d.leadScore ?? null,
         d.confidence ?? null, d.talkingPoints || [], d.positiveNote || null, d.openingLine || null, !!d.isOutdated]
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async markAnalysisFailed(id, maxAttempts) {
      await pool.query(
        `UPDATE leads SET analysis_attempts = analysis_attempts + 1,
           analysis_status = CASE WHEN analysis_attempts + 1 >= $2 THEN 'mislukt' ELSE 'wacht' END
         WHERE id = $1`, [id, maxAttempts]);
    },
    async requeueAnalysis(id) {
      const { rows } = await pool.query(
        `UPDATE leads SET analysis_status='wacht', analysis_attempts=0 WHERE id=$1 AND has_website=TRUE RETURNING *`, [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async clearLeads() {
      const { rowCount } = await pool.query('DELETE FROM leads');
      return rowCount;
    },
    async createRun({ target, filters }) {
      const { rows } = await pool.query(
        `INSERT INTO generation_runs (status, target, filters) VALUES ('pending', $1, $2) RETURNING id`,
        [target, JSON.stringify(filters || {})]);
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
        vals.push(v); cols.push(`${col} = $${vals.length}`);
      }
      if (!cols.length) return;
      vals.push(id);
      await pool.query(`UPDATE generation_runs SET ${cols.join(', ')} WHERE id = $${vals.length}`, vals);
    },
    async close() { await pool.end(); },
  };
}
