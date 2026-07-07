import { logger } from '../../utils/logger.js';
import { PROVINCES } from './nlData.js';

/**
 * OpenStreetMap (Overpass API) — gratis, geen API-key, geen account.
 * Haalt echte Nederlandse bedrijven op met telefoon + website uit open data.
 * Fair use: één (provincie)query per keer; resultaten worden gelimiteerd.
 */
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// OSM-provincienamen (Friesland heet officieel Fryslân)
const PROV_ALIAS = { Friesland: 'Fryslân' };

// OSM-categorie → leesbaar NL-label
const LABELS = {
  hairdresser: 'Kapper', bakery: 'Bakkerij', butcher: 'Slager', car_repair: 'Autogarage',
  car: 'Autobedrijf', beauty: 'Schoonheidssalon', bicycle: 'Fietsenwinkel', florist: 'Bloemist',
  hardware: 'IJzerhandel', furniture: 'Meubelzaak', clothes: 'Kledingwinkel', optician: 'Opticien',
  restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', fast_food: 'Cafetaria', pub: 'Café',
  dentist: 'Tandarts', pharmacy: 'Apotheek', veterinary: 'Dierenarts', driving_school: 'Rijschool',
  physiotherapist: 'Fysiotherapie', lawyer: 'Advocaat', estate_agent: 'Makelaar', accountant: 'Boekhouder',
  plumber: 'Loodgieter', painter: 'Schildersbedrijf', carpenter: 'Timmerbedrijf', electrician: 'Elektricien',
  gardener: 'Hovenier', roofer: 'Dakdekker', caterer: 'Catering',
};

function labelFor(tags) {
  const val = tags.shop || tags.craft || tags.office || tags.amenity || tags.healthcare;
  return LABELS[val] || (val ? String(val).replace(/_/g, ' ') : 'Bedrijf');
}

async function overpass(query) {
  let lastErr;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'AILeadFinder/1.0' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      logger.warn(`Overpass-endpoint faalde (${url}):`, e.message);
    }
  }
  throw lastErr || new Error('Overpass onbereikbaar');
}

const AMENITIES = 'restaurant|cafe|bar|fast_food|pub|dentist|pharmacy|veterinary|driving_school';

// Bedrijven MET een website (zodat we die echt kunnen auditeren).
function buildQueryWeb(osm) {
  return `[out:json][timeout:80];
area["admin_level"="4"]["name"="${osm}"]->.a;
(
  nwr["shop"]["website"](area.a);
  nwr["shop"]["contact:website"](area.a);
  nwr["craft"]["website"](area.a);
  nwr["office"]["website"](area.a);
  nwr["amenity"~"${AMENITIES}"]["website"](area.a);
  nwr["healthcare"]["website"](area.a);
);
out center tags 600;`;
}

// Bedrijven met telefoon maar ZONDER website → potentiële "geen website"-leads.
// [!"brand"] sluit ketens uit (die hebben wél een website), zodat alleen zelfstandige bedrijven overblijven.
function buildQueryPhone(osm) {
  return `[out:json][timeout:80];
area["admin_level"="4"]["name"="${osm}"]->.a;
(
  nwr["shop"]["phone"][!"website"][!"contact:website"][!"brand"](area.a);
  nwr["craft"]["phone"][!"website"][!"contact:website"][!"brand"](area.a);
  nwr["office"]["phone"][!"website"][!"contact:website"][!"brand"](area.a);
  nwr["amenity"~"${AMENITIES}"]["phone"][!"website"][!"contact:website"][!"brand"](area.a);
  nwr["healthcare"]["phone"][!"website"][!"contact:website"][!"brand"](area.a);
);
out center tags 400;`;
}

function mapEl(el, province, { requireWebsite }) {
  const t = el.tags || {};
  const name = t.name || t.operator;
  if (!name) return null;
  const website = t.website || t['contact:website'] || null;
  const phone = t.phone || t['contact:phone'] || t['contact:mobile'] || null;
  if (requireWebsite && !website) return null;
  if (!requireWebsite && !phone) return null; // "geen website"-tak vereist wel een telefoon
  return {
    companyName: name,
    branche: labelFor(t),
    province,
    city: t['addr:city'] || null,
    phone,
    email: t.email || t['contact:email'] || null,
    website,
    source: 'openstreetmap',
    externalId: `${el.type}/${el.id}`,
  };
}

export function createOverpassProvider() {
  return {
    name: 'openstreetmap',
    async *stream({ filters = {} } = {}) {
      const provinces = filters.province ? [filters.province] : Object.keys(PROVINCES);

      const passesLocal = (c) => {
        if (!c) return false;
        if (filters.city && c.city && c.city.toLowerCase() !== filters.city.toLowerCase()) return false;
        if (filters.branche && !c.branche.toLowerCase().includes(filters.branche.toLowerCase())) return false;
        return true;
      };

      for (const province of provinces) {
        const osm = PROV_ALIAS[province] || province;
        const mapProv = (els, requireWebsite) =>
          (els || []).map((el) => mapEl(el, province, { requireWebsite })).filter(passesLocal);

        let webEls = [], phoneEls = [];
        try { webEls = (await overpass(buildQueryWeb(osm))).elements || []; }
        catch (e) { logger.warn(`Overpass (website) mislukt voor ${province}:`, e.message); }
        try { phoneEls = (await overpass(buildQueryPhone(osm))).elements || []; }
        catch (e) { logger.warn(`Overpass (telefoon) mislukt voor ${province}:`, e.message); }

        const web = mapProv(webEls, true);         // bedrijven mét website (worden geauditeerd)
        const noSite = mapProv(phoneEls, false);   // bedrijven zónder website (heetste leads)

        // Interleave: per ronde eerst een "geen website"-lead, dan een website-lead,
        // zodat beide soorten in de resultaten terechtkomen.
        const max = Math.max(web.length, noSite.length);
        for (let i = 0; i < max; i++) {
          if (i < noSite.length) yield noSite[i];
          if (i < web.length) yield web[i];
        }
      }
    },
  };
}
