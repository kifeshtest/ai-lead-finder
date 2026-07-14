import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { scoreLabel } from '../services/analysis/leadScore.js';

/** In-memory store (fallback zonder DATABASE_URL). Data is ephemeraal. */
export function createMemoryStore() {
  const leads = [];
  const keys = new Set();
  const runs = new Map();
  let leadId = 1;
  let runId = 1;

  const isToday = (d) => {
    const n = new Date(); const x = new Date(d);
    return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate();
  };
  const withLabel = (l) => ({ ...l, label: scoreLabel(l.leadScore, l.confidence) });

  function matches(l, f = {}) {
    if (f.province && l.province !== f.province) return false;
    if (f.city && String(l.city || '').toLowerCase() !== String(f.city).toLowerCase()) return false;
    if (f.branche && !String(l.branche || '').toLowerCase().includes(String(f.branche).toLowerCase())) return false;
    if (f.employeesMin != null && (l.employees == null || l.employees < f.employeesMin)) return false;
    if (f.employeesMax != null && (l.employees == null || l.employees > f.employeesMax)) return false;
    if (f.onlyNoWebsite && l.hasWebsite) return false;
    if (f.hasWebsite && !l.hasWebsite) return false;
    if (f.onlyOutdated && !l.isOutdated) return false;
    if (f.onlyEmail && !l.email) return false;
    if (f.hasPhone && !l.phone) return false;
    if (f.favorite && !l.favorite) return false;
    if (f.analysisDone && l.analysisStatus !== 'voltooid') return false;
    if (f.status && (l.status || 'nieuw') !== f.status) return false;
    if (f.minScore != null && (l.websiteScore == null || l.websiteScore < f.minScore)) return false;
    if (f.maxScore != null && l.websiteScore != null && l.websiteScore > f.maxScore) return false;
    if (f.minLeadScore != null && (l.leadScore == null || l.leadScore < f.minLeadScore)) return false;
    if (f.maxPageSpeed != null && !(l.pagespeed && l.pagespeed.performance != null && l.pagespeed.performance <= f.maxPageSpeed)) return false;
    if (f.q) {
      const hay = `${l.companyName} ${l.city} ${l.website} ${l.phone} ${l.email}`.toLowerCase();
      if (!hay.includes(String(f.q).toLowerCase())) return false;
    }
    return true;
  }

  const nz = (v, d) => (v == null ? d : v);
  const sorters = {
    leadscore: (a, b) => nz(b.leadScore, -1) - nz(a.leadScore, -1) || new Date(b.createdAt) - new Date(a.createdAt),
    worst: (a, b) => (a.hasWebsite ? 1 : 0) - (b.hasWebsite ? 1 : 0) || nz(a.websiteScore, -1) - nz(b.websiteScore, -1),
    pagespeed: (a, b) => nz(a.pagespeed?.performance, 999) - nz(b.pagespeed?.performance, 999),
    seo: (a, b) => nz(a.pagespeed?.seo, 999) - nz(b.pagespeed?.seo, 999),
    recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    checked: (a, b) => new Date(b.analyzedAt || 0) - new Date(a.analyzedAt || 0),
    name: (a, b) => String(a.companyName).localeCompare(String(b.companyName)),
  };

  return {
    kind: 'memory',
    async init() { logger.info('Store: in-memory (ephemeraal). Zet DATABASE_URL voor persistente opslag.'); },
    async hasDedupeKey(key) { return keys.has(key); },
    async upsertLead(lead) {
      if (keys.has(lead.dedupeKey)) {
        const ex = leads.find((l) => l.dedupeKey === lead.dedupeKey);
        if (ex) ex.lastChecked = lead.lastChecked || new Date().toISOString();
        return { inserted: false };
      }
      keys.add(lead.dedupeKey);
      leads.unshift({
        id: leadId++, createdAt: new Date().toISOString(),
        status: 'nieuw', note: '', favorite: false, contactPerson: '', followUpDate: null,
        analysisStatus: lead.hasWebsite ? 'wacht' : 'nvt', analysisAttempts: 0, analyzedAt: null,
        pagespeed: {}, checks: {}, talkingPoints: [], positiveNote: '', openingLine: '',
        ...lead,
      });
      return { inserted: true };
    },
    async updateLead(id, patch) {
      const l = leads.find((x) => x.id === Number(id));
      if (!l) return null;
      for (const k of ['status', 'note', 'favorite', 'followUpDate', 'contactPerson', 'website']) {
        if (patch[k] !== undefined) l[k] = patch[k];
      }
      return withLabel(l);
    },
    async deleteLead(id) {
      const i = leads.findIndex((x) => x.id === Number(id));
      if (i === -1) return 0;
      keys.delete(leads[i].dedupeKey);
      leads.splice(i, 1);
      return 1;
    },
    async listLeads(filters = {}) {
      const limit = filters.limit || 500;
      const arr = leads.filter((l) => matches(l, filters));
      arr.sort(sorters[filters.sort] || sorters.leadscore);
      return arr.slice(0, limit).map(withLabel);
    },
    async stats() {
      const withSite = leads.filter((l) => l.hasWebsite);
      const scored = leads.filter((l) => l.leadScore != null);
      const avg = scored.length ? Math.round(scored.reduce((s, l) => s + l.leadScore, 0) / scored.length) : 0;
      return {
        total: leads.length,
        newToday: leads.filter((l) => isToday(l.createdAt)).length,
        withoutWebsite: leads.filter((l) => !l.hasWebsite).length,
        withWebsite: withSite.length,
        analyzed: leads.filter((l) => l.analysisStatus === 'voltooid').length,
        analysisPending: leads.filter((l) => l.analysisStatus === 'wacht' || l.analysisStatus === 'bezig').length,
        hot: leads.filter((l) => (l.leadScore ?? 0) >= 75).length,
        avgLeadScore: avg,
        poorWebsite: withSite.length, avgScore: avg, scoreThreshold: config.scoreThreshold,
      };
    },
    async claimNextAnalysis(maxAttempts) {
      const l = leads.find((x) => x.hasWebsite && x.website && (x.analysisStatus === 'wacht' || x.analysisStatus === 'mislukt') && x.analysisAttempts < maxAttempts);
      if (!l) return null;
      l.analysisStatus = 'bezig';
      return withLabel(l);
    },
    async saveAnalysis(id, d) {
      const l = leads.find((x) => x.id === Number(id));
      if (!l) return null;
      Object.assign(l, {
        pagespeed: d.pagespeed || {}, checks: d.checks || {}, leadScore: d.leadScore, confidence: d.confidence,
        talkingPoints: d.talkingPoints || [], positiveNote: d.positiveNote || '', openingLine: d.openingLine || '',
        isOutdated: !!d.isOutdated, analysisStatus: 'voltooid', analyzedAt: new Date().toISOString(),
        analysisAttempts: (l.analysisAttempts || 0) + 1,
      });
      return withLabel(l);
    },
    async markAnalysisFailed(id, maxAttempts) {
      const l = leads.find((x) => x.id === Number(id));
      if (!l) return;
      l.analysisAttempts = (l.analysisAttempts || 0) + 1;
      l.analysisStatus = l.analysisAttempts >= maxAttempts ? 'mislukt' : 'wacht';
    },
    async requeueAnalysis(id) {
      const l = leads.find((x) => x.id === Number(id));
      if (!l || !l.hasWebsite) return null;
      l.analysisStatus = 'wacht'; l.analysisAttempts = 0;
      return withLabel(l);
    },
    async clearLeads() { const n = leads.length; leads.length = 0; keys.clear(); return n; },
    async createRun({ target, filters }) {
      const id = runId++;
      runs.set(id, { id, status: 'pending', target, found: 0, scanned: 0, filters, error: null, createdAt: new Date().toISOString(), finishedAt: null });
      return id;
    },
    async getRun(id) { return runs.get(Number(id)) || null; },
    async updateRun(id, patch) { const r = runs.get(Number(id)); if (r) Object.assign(r, patch); },
    async close() {},
  };
}
