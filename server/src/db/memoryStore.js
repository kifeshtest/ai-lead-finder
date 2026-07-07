import { config } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * In-memory implementatie van de store (fallback wanneer er geen DATABASE_URL is).
 * Handig om zonder infrastructuur de volledige workflow te draaien. Data is ephemeraal.
 */
export function createMemoryStore() {
  const leads = [];
  const keys = new Set();
  const runs = new Map();
  let leadId = 1;
  let runId = 1;

  const isToday = (d) => {
    const now = new Date();
    const x = new Date(d);
    return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth() && x.getDate() === now.getDate();
  };

  function matches(l, f = {}) {
    if (f.province && l.province !== f.province) return false;
    if (f.city && String(l.city || '').toLowerCase() !== String(f.city).toLowerCase()) return false;
    if (f.branche && !String(l.branche || '').toLowerCase().includes(String(f.branche).toLowerCase())) return false;
    if (f.employeesMin != null && (l.employees == null || l.employees < f.employeesMin)) return false;
    if (f.employeesMax != null && (l.employees == null || l.employees > f.employeesMax)) return false;
    if (f.onlyNoWebsite && l.hasWebsite) return false;
    if (f.onlyOutdated && !l.isOutdated) return false;
    if (f.onlyEmail && !l.email) return false;
    if (f.status && (l.status || 'nieuw') !== f.status) return false;
    if (f.minScore != null && (l.websiteScore == null || l.websiteScore < f.minScore)) return false;
    if (f.maxScore != null && l.websiteScore != null && l.websiteScore > f.maxScore) return false;
    return true;
  }

  return {
    kind: 'memory',
    async init() {
      logger.info('Store: in-memory (ephemeraal). Zet DATABASE_URL voor persistente opslag.');
    },
    async hasDedupeKey(key) {
      return keys.has(key);
    },
    async upsertLead(lead) {
      if (keys.has(lead.dedupeKey)) {
        const existing = leads.find((l) => l.dedupeKey === lead.dedupeKey);
        if (existing) existing.lastChecked = lead.lastChecked || new Date().toISOString();
        return { inserted: false };
      }
      keys.add(lead.dedupeKey);
      leads.unshift({ id: leadId++, createdAt: new Date().toISOString(), status: 'nieuw', note: '', ...lead });
      return { inserted: true };
    },
    async updateLead(id, patch) {
      const l = leads.find((x) => x.id === Number(id));
      if (!l) return null;
      if (patch.status != null) l.status = patch.status;
      if (patch.note != null) l.note = patch.note;
      return l;
    },
    async listLeads(filters = {}) {
      const limit = filters.limit || 500;
      return leads.filter((l) => matches(l, filters)).slice(0, limit);
    },
    async stats() {
      const t = config.scoreThreshold;
      const withSite = leads.filter((l) => l.hasWebsite && l.websiteScore != null);
      const avg = withSite.length
        ? Math.round(withSite.reduce((s, l) => s + l.websiteScore, 0) / withSite.length)
        : 0;
      return {
        total: leads.length,
        newToday: leads.filter((l) => isToday(l.createdAt)).length,
        withoutWebsite: leads.filter((l) => !l.hasWebsite).length,
        poorWebsite: leads.filter((l) => l.hasWebsite && l.websiteScore != null && l.websiteScore < t).length,
        avgScore: avg,
      };
    },
    async createRun({ target, filters }) {
      const id = runId++;
      runs.set(id, { id, status: 'pending', target, found: 0, scanned: 0, filters, error: null, createdAt: new Date().toISOString(), finishedAt: null });
      return id;
    },
    async getRun(id) {
      return runs.get(Number(id)) || null;
    },
    async updateRun(id, patch) {
      const r = runs.get(Number(id));
      if (r) Object.assign(r, patch);
    },
    async close() {},
  };
}
