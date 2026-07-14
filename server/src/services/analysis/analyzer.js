import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { getStore } from '../../db/store.js';
import { runPageSpeed } from './pageSpeed.js';
import { runChecks } from './websiteChecks.js';
import { computeLeadScore } from './leadScore.js';
import { generateTalkingPoints } from './talkingPoints.js';

let running = false;

async function analyzeOne(store) {
  const lead = await store.claimNextAnalysis(config.analysisMaxAttempts);
  if (!lead) return false;
  try {
    const [checks, pagespeed] = await Promise.all([
      runChecks(lead.website),
      runPageSpeed(lead.website, 'mobile'),
    ]);

    // Site helemaal onbereikbaar én PageSpeed mislukt → later opnieuw proberen.
    const checksFailed = !checks || checks.reachable === false;
    const psFailed = !pagespeed || pagespeed.ok === false;
    if (checksFailed && psFailed) {
      await store.markAnalysisFailed(lead.id, config.analysisMaxAttempts);
      logger.debug(`Analyse tijdelijk mislukt (${lead.companyName}): ${pagespeed?.error || checks?.error}`);
      return true;
    }

    const { leadScore, confidence } = computeLeadScore(lead, pagespeed, checks);
    const { talkingPoints, positiveNote, openingLine } = generateTalkingPoints(lead, pagespeed, checks);
    const isOutdated = !!(checks && (checks.footerYearStale || checks.oldJquery || checks.flash || checks.modernStack === false || checks.notResponsive));

    await store.saveAnalysis(lead.id, {
      pagespeed: psFailed ? { ok: false, error: pagespeed?.error } : pagespeed,
      checks: checks || {},
      leadScore, confidence, talkingPoints, positiveNote, openingLine, isOutdated,
    });
    return true;
  } catch (err) {
    logger.warn(`Analyse fout voor lead ${lead.id}:`, err.message);
    await store.markAnalysisFailed(lead.id, config.analysisMaxAttempts);
    return true;
  }
}

/** Start de achtergrond-analyse (sequentieel; respecteert PageSpeed-limieten). */
export function startAnalyzer() {
  if (!config.analysisEnabled || running) return;
  running = true;
  logger.info(`Analyse-worker gestart (PageSpeed=${config.pageSpeedApiKey ? 'met key' : 'zonder key/rate-limited'}).`);
  const loop = async () => {
    let did = false;
    try {
      const store = await getStore();
      did = await analyzeOne(store);
    } catch (err) {
      logger.error('Analyse-loop fout:', err.message);
    }
    setTimeout(loop, did ? config.analysisIntervalMs : config.analysisIntervalMs * 4);
  };
  loop();
}
