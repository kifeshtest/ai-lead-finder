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

function buildQuery(osmProvince) {
  // Bedrijven MET een website (zodat we die echt kunnen auditeren) in de provincie.
  return `[out:json][timeout:80];
area["admin_level"="4"]["name"="${osmProvince}"]->.a;
(
  nwr["shop"]["website"](area.a);
  nwr["shop"]["contact:website"](area.a);
  nwr["craft"]["website"](area.a);
  nwr["office"]["website"](area.a);
  nwr["amenity"~"restaurant|cafe|bar|fast_food|pub|dentist|pharmacy|veterinary|driving_school"]["website"](area.a);
  nwr["healthcare"]["website"](area.a);
);
out center tags 600;`;
}

export function createOverpassProvider() {
  return {
    name: 'openstreetmap',
    async *stream({ filters = {} } = {}) {
      const provinces = filters.province ? [filters.province] : Object.keys(PROVINCES);
      for (const province of provinces) {
        const osmProvince = PROV_ALIAS[province] || province;
        let data;
        try {
          data = await overpass(buildQuery(osmProvince));
        } catch (e) {
          logger.warn(`Overpass mislukt (${province}):`, e.message);
          continue;
        }
        for (const el of data.elements || []) {
          const t = el.tags || {};
          const name = t.name || t.operator;
          const website = t.website || t['contact:website'];
          if (!name || !website) continue;

          const city = t['addr:city'] || '';
          if (filters.city && city && city.toLowerCase() !== filters.city.toLowerCase()) continue;

          const branche = labelFor(t);
          if (filters.branche) {
            const hay = `${branche} ${t.shop || ''} ${t.craft || ''} ${t.office || ''} ${t.amenity || ''} ${t.healthcare || ''}`.toLowerCase();
            if (!hay.includes(filters.branche.toLowerCase())) continue;
          }

          yield {
            companyName: name,
            branche,
            province,
            city: city || null,
            phone: t.phone || t['contact:phone'] || t['contact:mobile'] || null,
            email: t.email || t['contact:email'] || null, // OSM heeft soms wél e-mail (publiek ingevuld)
            website,
            source: 'openstreetmap',
            externalId: `${el.type}/${el.id}`,
          };
        }
      }
    },
  };
}
