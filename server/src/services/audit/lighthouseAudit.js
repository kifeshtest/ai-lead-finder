import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';

/**
 * Optionele echte Lighthouse-audit (performance 0-100 + Core Web Vitals).
 * Vereist ENABLE_LIGHTHOUSE=true en de optionalDependencies (lighthouse + chrome-launcher).
 * Faalt zacht: geeft null terug zodat de heuristische audit wordt gebruikt.
 */
export async function runLighthouse(url) {
  if (!config.enableLighthouse) return null;
  let chrome;
  try {
    const chromeLauncher = await import('chrome-launcher');
    const { default: lighthouse } = await import('lighthouse');
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });
    const result = await lighthouse(url, {
      port: chrome.port,
      onlyCategories: ['performance'],
      formFactor: 'mobile',
      screenEmulation: { mobile: true },
      output: 'json',
      logLevel: 'error',
    });
    const lhr = result.lhr;
    const performance = Math.round((lhr.categories.performance.score || 0) * 100);
    const cwv = {
      lcp: lhr.audits['largest-contentful-paint']?.numericValue ?? null,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
      tbt: lhr.audits['total-blocking-time']?.numericValue ?? null,
    };
    return { performance, cwv };
  } catch (err) {
    logger.warn('Lighthouse niet beschikbaar/mislukt, val terug op heuristiek:', err.message);
    return null;
  } finally {
    if (chrome) await chrome.kill().catch(() => {});
  }
}
