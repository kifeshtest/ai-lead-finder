/**
 * Bouwt een stabiele ontdubbelsleutel voor een bedrijf.
 * Prioriteit: KVK-nummer > genormaliseerd website-domein > naam+plaats.
 */
export function normalizeDomain(url) {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return String(url).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

export function slug(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function dedupeKey(company) {
  if (company.kvkNumber) return `kvk:${company.kvkNumber}`;
  const dom = normalizeDomain(company.website);
  if (dom) return `web:${dom}`;
  return `name:${slug(company.companyName)}|${slug(company.city)}`;
}
