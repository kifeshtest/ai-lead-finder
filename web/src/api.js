const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'lf_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

function authHeaders(extra = {}) {
  const t = getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : extra;
}

function clean(filters = {}) {
  const out = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v === '' || v === null || v === undefined || v === false) continue;
    out[k] = v;
  }
  return out;
}

async function json(res) {
  if (res.status === 401) { setToken(null); const e = new Error('Niet ingelogd'); e.code = 401; throw e; }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return res.json();
}

export const api = {
  health: () => fetch(`${BASE}/api/health`).then(json),
  login: (username, password) =>
    fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }).then(json),
  me: () => fetch(`${BASE}/api/auth/me`, { headers: authHeaders() }).then(json),
  logout: () => setToken(null),

  stats: () => fetch(`${BASE}/api/stats`, { headers: authHeaders() }).then(json),
  leads: (f) => fetch(`${BASE}/api/leads?${new URLSearchParams(clean(f))}`, { headers: authHeaders() }).then(json),
  startGeneration: (f) =>
    fetch(`${BASE}/api/generate`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(clean(f)) }).then(json),
  getRun: (id) => fetch(`${BASE}/api/generate/${id}`, { headers: authHeaders() }).then(json),
  updateLead: (id, patch) =>
    fetch(`${BASE}/api/leads/${id}`, { method: 'PATCH', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(patch) }).then(json),
  reanalyze: (id) => fetch(`${BASE}/api/leads/${id}/reanalyze`, { method: 'POST', headers: authHeaders() }).then(json),
  deleteLead: (id) => fetch(`${BASE}/api/leads/${id}`, { method: 'DELETE', headers: authHeaders() }).then(json),
  clearLeads: () => fetch(`${BASE}/api/leads`, { method: 'DELETE', headers: authHeaders() }).then(json),

  exportDownload: async (type, filters) => {
    const res = await fetch(`${BASE}/api/export/${type}?${new URLSearchParams(clean(filters))}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Export mislukt');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `leads.${type === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },
};

export const PROVINCES = [
  'Noord-Holland', 'Zuid-Holland', 'Utrecht', 'Noord-Brabant', 'Gelderland', 'Overijssel',
  'Groningen', 'Friesland', 'Drenthe', 'Flevoland', 'Limburg', 'Zeeland',
];

export const STATUS_OPTIONS = [
  { value: 'nieuw', label: 'Nieuw' },
  { value: 'te_bellen', label: 'Nog te bellen' },
  { value: 'gebeld', label: 'Gebeld' },
  { value: 'geen_gehoor', label: 'Geen gehoor' },
  { value: 'terugbellen', label: 'Terugbellen' },
  { value: 'gemaild', label: 'E-mail gestuurd' },
  { value: 'afspraak', label: 'Afspraak gepland' },
  { value: 'offerte', label: 'Offerte verstuurd' },
  { value: 'klant', label: 'Klant geworden' },
  { value: 'niet_geinteresseerd', label: 'Niet geïnteresseerd' },
  { value: 'ongeldig', label: 'Ongeldige lead' },
];
