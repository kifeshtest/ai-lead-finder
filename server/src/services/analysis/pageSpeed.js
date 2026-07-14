import { config } from '../../config.js';

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const pct = (s) => (s == null ? null : Math.round(s * 100));

/**
 * Officiële Google PageSpeed Insights (Lighthouse op Google's servers).
 * Werkt zonder key op laag volume (rate-limited); met PAGESPEED_API_KEY (gratis, geen billing) sneller.
 */
export async function runPageSpeed(url, strategy = 'mobile') {
  const params = new URLSearchParams({ url, strategy });
  for (const c of ['PERFORMANCE', 'SEO', 'ACCESSIBILITY', 'BEST_PRACTICES']) params.append('category', c);
  if (config.pageSpeedApiKey) params.set('key', config.pageSpeedApiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text();
      const msg = res.status === 429 ? 'PageSpeed rate limit (zet PAGESPEED_API_KEY voor meer quota)' : `PageSpeed ${res.status}`;
      return { ok: false, error: msg, detail: body.slice(0, 200) };
    }
    const data = await res.json();
    const lh = data.lighthouseResult;
    if (!lh) return { ok: false, error: 'Geen Lighthouse-resultaat' };
    const cat = lh.categories || {};
    const a = lh.audits || {};
    const num = (k) => (a[k] && typeof a[k].numericValue === 'number' ? Math.round(a[k].numericValue) : null);
    // INP komt uit veldgegevens (CrUX) indien beschikbaar
    const inp = data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentile ?? null;

    return {
      ok: true,
      strategy,
      performance: pct(cat.performance?.score),
      seo: pct(cat.seo?.score),
      accessibility: pct(cat.accessibility?.score),
      bestPractices: pct(cat['best-practices']?.score),
      lcpMs: num('largest-contentful-paint'),
      clsRaw: a['cumulative-layout-shift']?.numericValue ?? null,
      fcpMs: num('first-contentful-paint'),
      tbtMs: num('total-blocking-time'),
      siMs: num('speed-index'),
      inpMs: inp,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'PageSpeed timeout' : err.message };
  } finally {
    clearTimeout(timeout);
  }
}
