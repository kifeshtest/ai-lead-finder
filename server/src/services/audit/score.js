const CURRENT_YEAR = new Date().getFullYear();

const msToPerfScore = (ms) => {
  if (ms == null) return 70;
  if (ms <= 1200) return 95;
  if (ms <= 2000) return 82;
  if (ms <= 3000) return 62;
  if (ms <= 4500) return 42;
  return 22;
};

/**
 * Zet audit-signalen om in een websitescore (0-100, hoger = beter) + redenen.
 * Een score onder de drempel (default 55) markeert het bedrijf als lead.
 */
export function computeScore(signals) {
  if (!signals || signals.reachable === false) {
    return { score: 18, reasonTags: ['Website onbereikbaar'], reason: 'Website onbereikbaar', isOutdated: true };
  }

  let score = 100;
  const tags = [];
  const hit = (cond, amount, tag) => {
    if (cond) { score -= amount; if (tag) tags.push(tag); }
  };

  hit(!signals.https, 22, 'Geen SSL-certificaat');
  hit(!signals.mobileViewport, 18, 'Niet mobielvriendelijk');
  hit(!signals.responsive, 8, 'Geen responsive design');

  const perf = signals.lighthouse != null ? signals.lighthouse : msToPerfScore(signals.performanceMs);
  score -= Math.round((100 - perf) * 0.25);
  if (perf < 50) tags.push(signals.lighthouse != null ? `Lage Lighthouse-score (${perf})` : 'Trage laadtijd');

  hit(!signals.htmlValid, 5, 'HTML-validatiefouten');
  hit(!signals.hasPrivacy, 6, 'Geen privacy-/cookiebeleid');
  hit(!signals.hasContactForm, 6, 'Geen contactformulier');

  let outdatedByYear = false;
  if (signals.lastUpdateYear) {
    const age = CURRENT_YEAR - signals.lastUpdateYear;
    if (age >= 6) { score -= 16; tags.push(`Website uit ${signals.lastUpdateYear}`); outdatedByYear = true; }
    else if (age >= 3) { score -= 8; tags.push(`Verouderde website (${signals.lastUpdateYear})`); outdatedByYear = true; }
  }

  hit(!signals.modernStack, 6, 'Verouderde technologie');
  hit(signals.cms && /oud|joomla/i.test(signals.cms), 4, 'Verouderd CMS');

  score = Math.max(0, Math.min(100, Math.round(score)));
  const isOutdated = outdatedByYear || !signals.modernStack || !signals.mobileViewport;
  const reason = tags.slice(0, 2).join(' · ') || 'Website scoort onder de norm';
  return { score, reasonTags: tags, reason, isOutdated };
}
