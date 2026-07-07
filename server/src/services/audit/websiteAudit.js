import * as cheerio from 'cheerio';
import { config } from '../../config.js';

const CURRENT_YEAR = new Date().getFullYear();
// Realistische browser-identiteit (zoals Lighthouse/Chrome) om onterechte bot-blokkades (403) te vermijden.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function normalizeUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `https://${url}`;
}

function detectCms(html, headers) {
  const h = html.toLowerCase();
  const gen = (html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i) || [])[1];
  if (gen) return gen;
  if (headers.get('x-powered-by')?.toLowerCase().includes('wordpress') || h.includes('wp-content')) return 'WordPress';
  if (h.includes('cdn.shopify.com')) return 'Shopify';
  if (h.includes('wix.com')) return 'Wix';
  if (h.includes('joomla')) return 'Joomla';
  if (h.includes('drupal')) return 'Drupal';
  if (h.includes('.webflow.io') || h.includes('webflow')) return 'Webflow';
  if (h.includes('squarespace')) return 'Squarespace';
  return null;
}

function detectYear(html, headers) {
  const years = [...html.matchAll(/(?:©|&copy;|copyright)[^0-9]{0,12}(20[0-2]\d)/gi)]
    .map((m) => parseInt(m[1], 10))
    .filter((y) => y >= 2005 && y <= CURRENT_YEAR);
  if (years.length) return Math.max(...years);
  const lm = headers.get('last-modified');
  if (lm) { const y = new Date(lm).getFullYear(); if (y >= 2005 && y <= CURRENT_YEAR) return y; }
  return null;
}

/**
 * Echte, technische website-audit via één HTTP-request + HTML-analyse.
 * (Optioneel wordt de performance later verrijkt met Lighthouse.)
 */
export async function realAudit(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.auditTimeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    });
    const performanceMs = Date.now() - started;
    const finalUrl = res.url || url;
    const html = (await res.text()).slice(0, 300000);
    const $ = cheerio.load(html);

    const viewport = $('meta[name="viewport"]').attr('content') || '';
    const mobileViewport = /width\s*=\s*device-width/i.test(viewport);
    const responsive = mobileViewport || /@media[^{]*\(/i.test(html);

    const linkText = $('a').map((_, a) => `${$(a).attr('href') || ''} ${$(a).text()}`).get().join(' ').toLowerCase();
    const hasPrivacy = /privacy|cookie|\bavg\b|privacybeleid/.test(linkText) || /privacy|cookie/.test(html.toLowerCase());
    const hasContactForm = $('form').length > 0 || /contact/.test(linkText);

    const htmlValid = /<!doctype html>/i.test(html) && $('html').length > 0 && $('head title').length > 0;
    const modernStack =
      mobileViewport &&
      ($('script[type="module"]').length > 0 || $('img[srcset]').length > 0 || /display:\s*(grid|flex)/i.test(html)) &&
      !/jquery-1\.|jquery\/1\./i.test(html);

    return {
      reachable: res.ok,
      https: finalUrl.startsWith('https'),
      mobileViewport,
      responsive,
      performanceMs,
      lighthouse: null,
      htmlValid,
      hasPrivacy,
      hasContactForm,
      cms: detectCms(html, res.headers),
      lastUpdateYear: detectYear(html, res.headers),
      modernStack,
      finalUrl,
      status: res.status,
    };
  } catch (err) {
    return {
      reachable: false,
      https: false,
      error: err.name === 'AbortError' ? 'timeout' : err.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
