import { PROVINCES, BRANCHES, NAME_ROOTS, NAME_SUFFIX, pick } from './nlData.js';
import { slug } from '../../utils/dedupe.js';

/**
 * Mock-provider: genereert realistische Nederlandse bedrijven zonder externe API.
 * ~40% heeft geen website; websited bedrijven krijgen een `simulated`-profiel dat de
 * (gesimuleerde) website-audit voedt, met een sterke bias richting verouderde/zwakke sites.
 */
export function createMockProvider() {
  return {
    name: 'mock',
    async *stream({ filters = {} } = {}) {
      const provinces = filters.province ? [filters.province] : Object.keys(PROVINCES);
      let guard = 0;
      while (guard++ < 100000) {
        const province = pick(provinces);
        const cities = PROVINCES[province];
        const city = filters.city && cities.includes(filters.city) ? filters.city : pick(cities);
        const branche = filters.branche
          ? BRANCHES.find((b) => b.toLowerCase().includes(filters.branche.toLowerCase())) || pick(BRANCHES)
          : pick(BRANCHES);

        const root = pick(NAME_ROOTS);
        const suffix = pick(NAME_SUFFIX);
        const companyName = `${branche.replace(/bedrijf|salon|praktijk|kantoor|winkel|kliniek|kantoor/i, '').trim()} ${root} ${suffix}`.replace(/\s+/g, ' ').trim();

        const employees = pick([1, 2, 3, 4, 5, 8, 10, 12, 15, 20, 25, 35, 50]);
        if (filters.employeesMin != null && employees < filters.employeesMin) continue;
        if (filters.employeesMax != null && employees > filters.employeesMax) continue;

        const noWebsite = filters.onlyNoWebsite ? true : Math.random() < 0.4;
        const domain = `${slug(root)}-${slug(branche)}.nl`;

        const candidate = {
          companyName,
          kvkNumber: String(10000000 + Math.floor(Math.random() * 89999999)),
          branche,
          province,
          city,
          phone: `0${pick([6, 10, 20, 30, 40, 50, 70])}${Math.floor(1000000 + Math.random() * 8999999)}`,
          email: Math.random() < 0.5 ? `info@${domain}` : null,
          employees,
          source: 'mock',
        };

        if (noWebsite) {
          candidate.website = null;
        } else {
          candidate.website = `https://${domain}`;
          candidate.simulated = makeSiteProfile();
        }
        yield candidate;
      }
    },
  };
}

function makeSiteProfile() {
  const r = Math.random();
  // Bias: ~60% van de sites is zwak/verouderd → lead
  const weak = r < 0.6;
  const year = weak ? pick([2012, 2014, 2015, 2016, 2017]) : pick([2021, 2022, 2023, 2024]);
  return {
    reachable: Math.random() > 0.03,
    https: weak ? Math.random() > 0.45 : true,
    mobileViewport: weak ? Math.random() > 0.55 : Math.random() > 0.1,
    responsive: weak ? Math.random() > 0.6 : true,
    performanceMs: weak ? 2600 + Math.floor(Math.random() * 4000) : 700 + Math.floor(Math.random() * 1500),
    lighthouse: weak ? 25 + Math.floor(Math.random() * 30) : 70 + Math.floor(Math.random() * 28),
    htmlValid: Math.random() > (weak ? 0.5 : 0.15),
    hasPrivacy: weak ? Math.random() > 0.6 : Math.random() > 0.2,
    hasContactForm: weak ? Math.random() > 0.5 : Math.random() > 0.25,
    cms: pick(weak ? ['WordPress (oud)', 'Joomla', 'Zelfbouw', null] : ['WordPress', 'Webflow', 'Shopify', null]),
    lastUpdateYear: year,
    modernStack: !weak,
  };
}
