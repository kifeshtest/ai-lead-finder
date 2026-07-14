export function scoreLabel(leadScore, confidence) {
  if (leadScore == null) return null;
  if (confidence != null && confidence < 40) return 'Handmatige controle nodig';
  if (leadScore >= 75) return 'Hoge kans';
  if (leadScore >= 55) return 'Interessante kans';
  if (leadScore >= 35) return 'Gemiddelde kans';
  return 'Lage prioriteit';
}
const labelFor = scoreLabel;

function confidenceFor(lead, checks) {
  let c = 45; // OpenStreetMap-basis
  if (lead.companyName) c += 8;
  if (lead.city) c += 6;
  if (lead.phone) c += 14;
  if (lead.email) c += 6;
  if (lead.hasWebsite) c += checks && checks.reachable ? 18 : 2;
  return Math.max(0, Math.min(100, c));
}

/**
 * Commerciële leadscore (0-100, hoger = betere kans) + betrouwbaarheid van de gegevens.
 * De beste leads: actieve bedrijven met een bestaande maar slechte website.
 */
export function computeLeadScore(lead, pagespeed, checks) {
  const confidence = confidenceFor(lead, checks);

  if (!lead.hasWebsite) {
    let s = 72;
    if (lead.phone) s += 6;
    if (lead.email) s += 2;
    const leadScore = Math.min(88, s);
    return { leadScore, confidence, label: labelFor(leadScore, confidence) };
  }

  let bad = 15; // basiskans voor "heeft website"
  if (pagespeed && pagespeed.ok !== false) {
    if (pagespeed.performance != null) bad += Math.round((100 - pagespeed.performance) * 0.35);
    if (pagespeed.seo != null) bad += Math.round((100 - pagespeed.seo) * 0.22);
    if (pagespeed.accessibility != null) bad += Math.round((100 - pagespeed.accessibility) * 0.06);
  } else if (lead.websiteScore != null) {
    bad += Math.round((100 - lead.websiteScore) * 0.5); // val terug op heuristiek
  }
  // Alleen straffen op écht gemeten checks (niet op een mislukte fetch).
  if (checks && checks.reachable !== false) {
    if (checks.https === false) bad += 16;
    if (checks.mobileViewport === false || checks.notResponsive) bad += 14;
    if (checks.footerYearStale || checks.oldJquery || checks.flash || checks.modernStack === false) bad += 8;
    if (checks.hasCTA === false) bad += 5;
    if (checks.hasContactForm === false) bad += 4;
    if (checks.metaDescription === false) bad += 3;
    if (checks.oneClearH1 === false) bad += 2;
    if (checks.mixedContent) bad += 3;
  }
  const leadScore = Math.max(0, Math.min(100, bad));
  return { leadScore, confidence, label: labelFor(leadScore, confidence) };
}
