import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { PROVINCES, BRANCHES } from './nlData.js';

/**
 * Google Places API (v1) — officiële, toegestane bron.
 * Levert bedrijfsnaam, website, telefoonnummer en plaats. Géén scraping van Bedrijfsprofielen.
 * Vereist GOOGLE_PLACES_API_KEY (met billing).
 */
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = [
  'places.id',
  'places.displayName',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.formattedAddress',
  'places.primaryTypeDisplayName',
  'nextPageToken',
].join(',');

async function searchText(textQuery, pageToken) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.googlePlacesApiKey,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({ textQuery, regionCode: 'NL', languageCode: 'nl', pageToken }),
  });
  if (!res.ok) {
    throw new Error(`Google Places ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

function cityToProvince(city) {
  for (const [prov, cities] of Object.entries(PROVINCES)) if (cities.includes(city)) return prov;
  return null;
}

export function createGoogleProvider() {
  if (!config.googlePlacesApiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY ontbreekt — zet de key of gebruik LEAD_SOURCE=mock.');
  }
  return {
    name: 'google',
    async *stream({ filters = {} } = {}) {
      const provinces = filters.province ? [filters.province] : Object.keys(PROVINCES);
      const branches = filters.branche ? [filters.branche] : BRANCHES;
      const maxCalls = config.maxPlacesRequests;
      let calls = 0;
      for (const province of provinces) {
        const cities = filters.city ? [filters.city] : PROVINCES[province];
        for (const city of cities) {
          for (const branche of branches) {
            let pageToken;
            for (let page = 0; page < 3; page++) {
              if (calls >= maxCalls) {
                logger.info(`Places-limiet bereikt (${maxCalls} verzoeken) — stoppen om kosten te beperken.`);
                return;
              }
              let data;
              try {
                calls++;
                data = await searchText(`${branche} in ${city}`, pageToken);
              } catch (err) {
                logger.warn(`Places-zoekopdracht mislukt (${branche}/${city}):`, err.message);
                break;
              }
              for (const p of data.places || []) {
                yield {
                  companyName: p.displayName?.text || 'Onbekend',
                  branche: p.primaryTypeDisplayName?.text || branche,
                  province: cityToProvince(city) || province,
                  city,
                  phone: p.nationalPhoneNumber || null,
                  email: null, // niet ophalen (AVG)
                  website: p.websiteUri || null,
                  source: 'google',
                  externalId: p.id,
                };
              }
              pageToken = data.nextPageToken;
              if (!pageToken) break;
              await new Promise((r) => setTimeout(r, 1500)); // Places page-token wachttijd
            }
          }
        }
      }
    },
  };
}

/** Enrichment-helper: vind de website van een bedrijf op naam + plaats (voor KVK-bron). */
export async function resolveWebsite(name, city) {
  if (!config.googlePlacesApiKey) return null;
  try {
    const data = await searchText(`${name} ${city || ''}`.trim());
    return data.places?.[0]?.websiteUri || null;
  } catch {
    return null;
  }
}
