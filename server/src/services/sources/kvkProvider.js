import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { PROVINCES } from './nlData.js';
import { resolveWebsite } from './googlePlacesProvider.js';

/**
 * Officiële KVK Zoeken API (v2). Levert firmografische data uit het Handelsregister.
 *
 * Let op: de KVK-zoek-API geeft GEEN website/telefoon/e-mail. Om te bepalen of een bedrijf
 * een (verouderde) website heeft, verrijken we de website via de Google Places API
 * (resolveWebsite) wanneer GOOGLE_PLACES_API_KEY is gezet. Zonder die key wordt de website
 * als "onbekend" gemarkeerd (handmatige controle nodig) — er wordt NIET gescrapet.
 */
export function createKvkProvider() {
  if (!config.kvkApiKey) {
    throw new Error('KVK_API_KEY ontbreekt — zet de key of gebruik LEAD_SOURCE=mock.');
  }
  const base = config.kvkApiBase;

  async function zoek(params, page) {
    const qs = new URLSearchParams({ ...params, resultatenPerPagina: '100', pagina: String(page) });
    const res = await fetch(`${base}/zoeken?${qs}`, { headers: { apikey: config.kvkApiKey, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`KVK API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }

  return {
    name: 'kvk',
    async *stream({ filters = {} } = {}) {
      const provinces = filters.province ? [filters.province] : Object.keys(PROVINCES);
      for (const province of provinces) {
        const cities = filters.city ? [filters.city] : PROVINCES[province];
        for (const plaats of cities) {
          const params = { type: 'hoofdvestiging', plaats };
          if (filters.branche) params.naam = filters.branche;
          for (let page = 1; page <= 5; page++) {
            let data;
            try {
              data = await zoek(params, page);
            } catch (err) {
              logger.warn(`KVK-zoekopdracht mislukt (${plaats}):`, err.message);
              break;
            }
            const resultaten = data.resultaten || [];
            if (!resultaten.length) break;
            for (const r of resultaten) {
              const companyName = r.naam || r.handelsnaam || 'Onbekend';
              const website = await resolveWebsite(companyName, plaats);
              yield {
                companyName,
                kvkNumber: r.kvkNummer || r.vestigingsnummer || null,
                branche: filters.branche || r.type || null,
                province,
                city: plaats,
                phone: null,
                email: null,
                website, // null = geen website gevonden; wordt lead
                websiteUnknown: !config.googlePlacesApiKey, // geen verrijking mogelijk
                source: 'kvk',
              };
            }
            if (resultaten.length < 100) break;
          }
        }
      }
    },
  };
}
