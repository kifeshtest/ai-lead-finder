// Vite proxyt /api naar de backend (zie vite.config.js). Zet VITE_API_URL voor een andere host.
const BASE = import.meta.env.VITE_API_URL || '';

function clean(filters = {}) {
  const out = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v === '' || v === null || v === undefined || v === false) continue;
    out[k] = v;
  }
  return out;
}

async function json(res) {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return res.json();
}

export const api = {
  health: () => fetch(`${BASE}/api/health`).then(json),
  stats: () => fetch(`${BASE}/api/stats`).then(json),
  leads: (filters) => fetch(`${BASE}/api/leads?${new URLSearchParams(clean(filters))}`).then(json),
  startGeneration: (filters) =>
    fetch(`${BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean(filters)),
    }).then(json),
  getRun: (id) => fetch(`${BASE}/api/generate/${id}`).then(json),
  updateLead: (id, patch) =>
    fetch(`${BASE}/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(json),
  exportUrl: (type, filters) => `${BASE}/api/export/${type}?${new URLSearchParams(clean(filters))}`,
};

export const PROVINCES = [
  'Noord-Holland', 'Zuid-Holland', 'Utrecht', 'Noord-Brabant', 'Gelderland', 'Overijssel',
  'Groningen', 'Friesland', 'Drenthe', 'Flevoland', 'Limburg', 'Zeeland',
];
