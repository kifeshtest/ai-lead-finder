import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { getProvider } from './sources/index.js';
import { auditCompany } from './audit/index.js';
import { generateMotivation } from './ai/motivation.js';
import { dedupeKey } from '../utils/dedupe.js';

function toLead(candidate, audit, key) {
  return {
    dedupeKey: key,
    companyName: candidate.companyName,
    kvkNumber: candidate.kvkNumber || null,
    branche: candidate.branche || null,
    province: candidate.province || null,
    city: candidate.city || null,
    phone: candidate.phone || null,
    email: candidate.email || null,
    website: candidate.website || null,
    hasWebsite: audit.hasWebsite,
    employees: candidate.employees ?? null,
    websiteScore: audit.score,
    isOutdated: audit.isOutdated,
    reason: audit.reason,
    reasonTags: audit.reasonTags,
    audit: audit.audit,
    source: candidate.source || config.leadSource,
    lastChecked: new Date().toISOString(),
  };
}

function passesFilters(candidate, audit, filters) {
  if (filters.onlyNoWebsite && audit.hasWebsite) return false;
  if (filters.onlyOutdated && !audit.isOutdated) return false;
  if (filters.employeesMin != null || filters.employeesMax != null) {
    const e = candidate.employees;
    if (e == null) return false;
    if (filters.employeesMin != null && e < filters.employeesMin) return false;
    if (filters.employeesMax != null && e > filters.employeesMax) return false;
  }
  return true;
}

/**
 * Kernproces: zoekt door de gekozen bron totdat er `leadsPerRun` unieke, kwalificerende
 * leads zijn opgeslagen (of tot de bron leeg is / max. pogingen bereikt zijn).
 * Ontdubbeling gebeurt tegen de store én binnen de run.
 */
export async function runGeneration({ runId, filters = {}, store }) {
  const provider = getProvider();
  const target = config.leadsPerRun;
  const concurrency = Math.max(1, config.auditConcurrency);

  await store.updateRun(runId, { status: 'running' });
  logger.info(`Run ${runId}: start (bron=${provider.name}, doel=${target})`);

  const iterator = provider.stream({ filters })[Symbol.asyncIterator]();
  const seen = new Set();
  let collected = 0;
  let reserved = 0;
  let scanned = 0;
  let stop = false;

  // Serialiseer .next() — async generators mogen niet parallel worden aangeroepen.
  let pullLock = Promise.resolve();
  function pull() {
    const p = pullLock.then(() => iterator.next());
    pullLock = p.then(() => {}, () => {});
    return p.then((r) => (r.done ? null : r.value));
  }

  async function worker() {
    while (!stop) {
      const candidate = await pull();
      if (!candidate) return;

      scanned++;
      if (scanned % 25 === 0) await store.updateRun(runId, { scanned });
      if (scanned > config.maxSearchAttempts) { stop = true; return; }

      const key = dedupeKey(candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      if (await store.hasDedupeKey(key)) continue;

      let audit;
      try {
        audit = await auditCompany(candidate);
      } catch (err) {
        logger.debug('Audit-fout:', err.message);
        continue;
      }
      if (!audit.qualifies) continue;
      if (!passesFilters(candidate, audit, filters)) continue;

      // Reserveer atomisch een slot (synchroon, geen await ertussen) → exact `target` leads.
      if (reserved >= target) { stop = true; return; }
      reserved++;

      const lead = toLead(candidate, audit, key);
      lead.motivation = await generateMotivation(lead);
      const { inserted } = await store.upsertLead(lead);
      if (inserted) {
        collected++;
        await store.updateRun(runId, { found: collected, scanned });
        if (collected >= target) { stop = true; return; }
      } else {
        reserved--; // dubbel geslopen: slot vrijgeven
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const status = collected >= target ? 'done' : 'done';
  await store.updateRun(runId, { status, found: collected, scanned, finishedAt: new Date().toISOString() });
  logger.info(`Run ${runId}: klaar — ${collected}/${target} leads (${scanned} bedrijven bekeken)`);
  return { collected, scanned };
}
