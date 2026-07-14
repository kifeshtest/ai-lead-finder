const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));
const bool = (v) => v === true || v === 'true' || v === '1' || v === 1;

/** Parseert filters uit query of body naar een genormaliseerd object (undefined-velden weggelaten). */
export function parseFilters(src = {}) {
  const f = {
    province: src.province || undefined,
    city: src.city || undefined,
    branche: src.branche || undefined,
    employeesMin: num(src.employeesMin),
    employeesMax: num(src.employeesMax),
    minScore: num(src.minScore),
    maxScore: num(src.maxScore),
    onlyNoWebsite: src.onlyNoWebsite !== undefined ? bool(src.onlyNoWebsite) : undefined,
    hasWebsite: src.hasWebsite !== undefined ? bool(src.hasWebsite) : undefined,
    onlyOutdated: src.onlyOutdated !== undefined ? bool(src.onlyOutdated) : undefined,
    onlyEmail: src.onlyEmail !== undefined ? bool(src.onlyEmail) : undefined,
    hasPhone: src.hasPhone !== undefined ? bool(src.hasPhone) : undefined,
    favorite: src.favorite !== undefined ? bool(src.favorite) : undefined,
    analysisDone: src.analysisDone !== undefined ? bool(src.analysisDone) : undefined,
    minLeadScore: num(src.minLeadScore),
    maxPageSpeed: num(src.maxPageSpeed),
    status: src.status || undefined,
    q: src.q || undefined,
    sort: src.sort || undefined,
    limit: num(src.limit),
  };
  for (const k of Object.keys(f)) if (f[k] === undefined || Number.isNaN(f[k])) delete f[k];
  return f;
}
