import { useEffect, useRef, useState } from 'react';
import { api, getToken } from './api.js';
import Login from './components/Login.jsx';
import StatsBar from './components/StatsBar.jsx';
import Filters from './components/Filters.jsx';
import GenerateButton from './components/GenerateButton.jsx';
import LeadCard from './components/LeadCard.jsx';
import ExportBar from './components/ExportBar.jsx';

const SORTS = [
  { value: 'leadscore', label: 'Beste kans eerst' },
  { value: 'pagespeed', label: 'Laagste PageSpeed' },
  { value: 'seo', label: 'Laagste SEO' },
  { value: 'worst', label: 'Zwakste/geen website' },
  { value: 'recent', label: 'Nieuwste' },
  { value: 'checked', label: 'Recent geanalyseerd' },
  { value: 'name', label: 'Bedrijfsnaam' },
];

export default function App() {
  const [authed, setAuthed] = useState(null); // null=checking, false=login, true=in
  const [filters, setFilters] = useState({});
  const [applied, setApplied] = useState({});
  const [sort, setSort] = useState('leadscore');
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const refreshRef = useRef(null);

  const on401 = (e) => { if (e && e.code === 401) { setAuthed(false); return true; } setError(e.message); return false; };

  useEffect(() => {
    if (!getToken()) { setAuthed(false); return; }
    api.me().then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  const loadStats = () => api.stats().then(setStats).catch(on401);
  const loadLeads = (f = applied) => {
    setLoading(true);
    return api.leads({ ...f, sort }).then((r) => setLeads(r.leads)).catch(on401).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authed !== true) return;
    api.health().then(setHealth).catch(() => {});
    loadStats(); loadLeads({});
    // Auto-ververs zodat analyse-scores binnendruppelen
    refreshRef.current = setInterval(async () => {
      try {
        const s = await api.stats(); setStats(s);
        if (s.analysisPending > 0) { const r = await api.leads({ ...applied, sort }); setLeads(r.leads); }
      } catch (e) { on401(e); }
    }, 10000);
    return () => { clearInterval(refreshRef.current); clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const applyFilters = () => { setApplied(filters); api.leads({ ...filters, sort }).then((r) => setLeads(r.leads)).catch(on401); };
  const resetFilters = () => { setFilters({}); setApplied({}); api.leads({ sort }).then((r) => setLeads(r.leads)).catch(on401); };
  const changeSort = (v) => { setSort(v); setLoading(true); api.leads({ ...applied, sort: v }).then((r) => setLeads(r.leads)).catch(on401).finally(() => setLoading(false)); };

  const updateLead = async (id, p) => { const { lead } = await api.updateLead(id, p); setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...lead } : l))); };
  const reanalyze = async (id) => { try { const { lead } = await api.reanalyze(id); setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...lead } : l))); } catch (e) { on401(e); } };
  const deleteLead = async (id) => { if (!window.confirm('Deze lead verwijderen?')) return; try { await api.deleteLead(id); setLeads((prev) => prev.filter((l) => l.id !== id)); loadStats(); } catch (e) { on401(e); } };
  const clearAll = async () => { if (!window.confirm('ALLE leads verwijderen? Dit kan niet ongedaan worden gemaakt.')) return; try { await api.clearLeads(); await Promise.all([loadLeads(applied), loadStats()]); } catch (e) { on401(e); } };
  const logout = () => { api.logout(); setAuthed(false); };

  const onGenerate = async () => {
    setError(null); setGenerating(true); setProgress({ found: 0, target: 50, scanned: 0 });
    try {
      const { runId, target } = await api.startGeneration(filters);
      setProgress((p) => ({ ...p, target: target || 50 }));
      pollRef.current = setInterval(async () => {
        try {
          const run = await api.getRun(runId);
          setProgress({ found: run.found, target: run.target, scanned: run.scanned });
          if (run.status === 'done' || run.status === 'error') {
            clearInterval(pollRef.current); setGenerating(false);
            if (run.status === 'error') setError(run.error || 'Generatie mislukt');
            setApplied(filters); await Promise.all([loadLeads(filters), loadStats()]);
          }
        } catch (e) { clearInterval(pollRef.current); setGenerating(false); on401(e); }
      }, 1000);
    } catch (e) { setGenerating(false); on401(e); }
  };

  if (authed === null) return <div className="flex min-h-screen items-center justify-center text-slate-400">Laden…</div>;
  if (authed === false) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">AI Lead Finder <span className="text-brand-600">Nederland</span></h1>
          <p className="text-sm text-slate-500">Actieve bedrijven met kansen voor een nieuwe of betere website.</p>
        </div>
        <div className="flex items-center gap-3">
          <GenerateButton onGenerate={onGenerate} generating={generating} progress={progress} />
          <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Uitloggen</button>
        </div>
      </header>

      {health && (
        <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
          {['Bron: ' + health.source, 'Opslag: ' + health.storage, 'PageSpeed: ' + health.pagespeed].map((b) => (
            <span key={b} className="rounded-full bg-slate-200 px-2.5 py-1 font-medium text-slate-600">{b}</span>
          ))}
          {health.pagespeed === 'zonder-key' && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">Zet PAGESPEED_API_KEY voor betrouwbare scores (gratis, geen creditcard)</span>
          )}
        </div>
      )}
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="mb-6"><StatsBar stats={stats} /></div>
      <div className="mb-6"><Filters filters={filters} setFilters={setFilters} onApply={applyFilters} onReset={resetFilters} /></div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">{leads.length} leads</h2>
          <label className="flex items-center gap-2 text-sm text-slate-600">Sorteer:
            <select value={sort} onChange={(e) => changeSort(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <ExportBar filters={{ ...applied, sort }} />
          <button onClick={clearAll} className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">🗑 Wis alles</button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Laden…</div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-slate-500">Nog geen leads. Klik op <b>Genereer 50 Leads</b> om te starten.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((l) => <LeadCard key={l.id ?? l.dedupeKey} lead={l} onUpdate={updateLead} onReanalyze={reanalyze} onDelete={deleteLead} />)}
        </div>
      )}
    </div>
  );
}
