import * as cheerio from 'cheerio';
import { config } from '../../config.js';

const CURRENT_YEAR = new Date().getFullYear();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function normalizeUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `https://${url}`;
}

async function fetchText(url, ms = config.auditTimeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } });
    const text = (await res.text()).slice(0, 400000);
    return { ok: res.ok, status: res.status, finalUrl: res.url || url, headers: res.headers, text };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(t);
  }
}

async function resourceExists(base, path) {
  try {
    const u = new URL(path, base).href;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(u, { method: 'GET', signal: controller.signal, headers: { 'User-Agent': UA } });
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
}

/** Diepe, feitelijke website-controle. Retourneert een `checks`-object met meetbare signalen. */
export async function runChecks(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return { reachable: false, error: 'geen url' };

  let r = await fetchText(url);
  if (!r.ok && !r.text) { await new Promise((res) => setTimeout(res, 500)); r = await fetchText(url); }
  if (!r.ok && !r.text) return { reachable: false, error: r.error || `status ${r.status}` };

  const finalUrl = r.finalUrl;
  const html = r.text || '';
  const low = html.toLowerCase();
  const $ = cheerio.load(html);

  const title = ($('head title').first().text() || '').trim();
  const metaDesc = ($('meta[name="description"]').attr('content') || '').trim();
  const viewport = $('meta[name="viewport"]').attr('content') || '';
  const h1Count = $('h1').length;
  const imgs = $('img');
  const imgsMissingAlt = imgs.filter((_, el) => !($(el).attr('alt') || '').trim()).length;
  const linksText = $('a').map((_, a) => `${$(a).attr('href') || ''} ${$(a).text()}`).get().join(' ').toLowerCase();

  const cms =
    ($('meta[name="generator"]').attr('content') || '') ||
    (low.includes('wp-content') ? 'WordPress' :
      low.includes('cdn.shopify') ? 'Shopify' :
      low.includes('wix.com') ? 'Wix' :
      low.includes('joomla') ? 'Joomla' :
      low.includes('drupal') ? 'Drupal' :
      low.includes('squarespace') ? 'Squarespace' :
      /\.webflow\.io|webflow/.test(low) ? 'Webflow' : null);

  const years = [...html.matchAll(/(?:©|&copy;|copyright)[^0-9]{0,12}(20[0-2]\d)/gi)].map((m) => +m[1]).filter((y) => y >= 2005 && y <= CURRENT_YEAR);
  const copyrightYear = years.length ? Math.max(...years) : null;

  const httpsUp = finalUrl.startsWith('https');
  const mixedContent = httpsUp && /(?:src|href)=["']http:\/\//i.test(html);
  const socials = ['facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com'].filter((s) => low.includes(s));

  const [robots, sitemap] = await Promise.all([
    resourceExists(finalUrl, '/robots.txt'),
    resourceExists(finalUrl, '/sitemap.xml'),
  ]);

  const checks = {
    reachable: true,
    finalUrl,
    https: httpsUp,
    title: title.length > 0,
    titleText: title.slice(0, 120),
    metaDescription: metaDesc.length > 0,
    h1Count,
    oneClearH1: h1Count === 1,
    imagesTotal: imgs.length,
    imagesMissingAlt: imgsMissingAlt,
    hasFavicon: $('link[rel~="icon"]').length > 0,
    mobileViewport: /width\s*=\s*device-width/i.test(viewport),
    notResponsive: !/width\s*=\s*device-width/i.test(viewport) && !/@media[^{]*\(/i.test(html),
    mixedContent,
    cms: cms || null,
    oldJquery: /jquery[-/]1\.|jquery[-/]2\./i.test(html),
    flash: /\.swf|application\/x-shockwave-flash/i.test(low),
    copyrightYear,
    footerYearStale: copyrightYear ? CURRENT_YEAR - copyrightYear >= 2 : false,
    hasContactForm: $('form').length > 0 || /contact/.test(linksText),
    phoneVisible: /tel:/.test(low) || /\b0\d[\s\-.]?\d{7,8}\b|\+31/.test(html),
    emailVisible: /mailto:/.test(low) || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(html),
    hasCTA: /(offerte|afspraak|contact opnemen|vraag aan|bel ons|reserveer|boek nu|gratis)/i.test(html),
    socialLinks: socials,
    hasPrivacy: /privacy|cookie|avg/.test(linksText) || /privacy|cookie/.test(low),
    robotsTxt: robots,
    sitemapXml: sitemap,
    modernStack: /width\s*=\s*device-width/i.test(viewport) && ($('script[type="module"]').length > 0 || $('img[srcset]').length > 0 || /display:\s*(grid|flex)/i.test(html)) && !/jquery[-/]1\./i.test(html),
  };
  return checks;
}
