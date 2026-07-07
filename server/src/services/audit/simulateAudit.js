/**
 * Zet een mock site-profiel om in dezelfde signaal-structuur als een echte audit,
 * zodat scoring identiek werkt voor mock- en echte bronnen.
 */
export function simulateAudit(profile = {}) {
  return {
    reachable: profile.reachable !== false,
    https: !!profile.https,
    mobileViewport: !!profile.mobileViewport,
    responsive: !!profile.responsive,
    performanceMs: profile.performanceMs ?? 2000,
    lighthouse: profile.lighthouse ?? null,
    htmlValid: !!profile.htmlValid,
    hasPrivacy: !!profile.hasPrivacy,
    hasContactForm: !!profile.hasContactForm,
    cms: profile.cms ?? null,
    lastUpdateYear: profile.lastUpdateYear ?? null,
    modernStack: !!profile.modernStack,
    simulated: true,
  };
}
