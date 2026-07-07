import { config } from '../../config.js';
import { realAudit } from './websiteAudit.js';
import { simulateAudit } from './simulateAudit.js';
import { runLighthouse } from './lighthouseAudit.js';
import { computeScore } from './score.js';

/**
 * Auditeert één kandidaat-bedrijf en bepaalt of het een lead is.
 * @returns {{ hasWebsite:boolean, qualifies:boolean, score:number|null, reason:string,
 *   reasonTags:string[], isOutdated:boolean, audit:object }}
 */
export async function auditCompany(candidate) {
  // Geen (bekende) website → directe lead.
  if (!candidate.website) {
    if (candidate.websiteUnknown) {
      return {
        hasWebsite: false, qualifies: true, score: null,
        reason: 'Website onbekend — handmatige controle nodig',
        reasonTags: ['Website onbekend'], isOutdated: false, audit: {},
      };
    }
    return {
      hasWebsite: false, qualifies: true, score: null,
      reason: 'Geen website gevonden', reasonTags: ['Geen website'], isOutdated: false, audit: {},
    };
  }

  // Website aanwezig → audit uitvoeren (echt of gesimuleerd).
  const signals = candidate.simulated ? simulateAudit(candidate.simulated) : await realAudit(candidate.website);

  if (!candidate.simulated && config.enableLighthouse && signals.reachable) {
    const lh = await runLighthouse(signals.finalUrl || candidate.website);
    if (lh) { signals.lighthouse = lh.performance; signals.cwv = lh.cwv; }
  }

  const { score, reason, reasonTags, isOutdated } = computeScore(signals);
  const reachable = signals.reachable !== false;
  return {
    hasWebsite: true,
    // Alleen een lead als we de site écht konden bereiken én die zwak scoort.
    // Onbereikbare audits (vaak een tijdelijke fout) niet als "zwakke site" tellen.
    qualifies: reachable && score < config.scoreThreshold,
    score, reason, reasonTags, isOutdated,
    audit: signals,
  };
}
