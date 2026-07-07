import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import StatsBar from './components/StatsBar.jsx';
import Filters from './components/Filters.jsx';
import GenerateButton from './components/GenerateButton.jsx';
import LeadCard from './components/LeadCard.jsx';
import ExportBar from './components/ExportBar.jsx';

export default function App() {
  const [filters, setFilters] = useState({});
  const [applied, setApplied] = useState({});
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const loadStats = () => api.stats().then(setStats).catch(() => {});
  const loadLeads = (f) => {
    setLoading(true);
    return api.leads(f).then((r) => setLeads(r.leads)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.health().then(setHealth).catch(() => setError('Backend niet bereikbaar op :4000. Draait de server?'));
    loadStats();
    loadLeads({});
    return () => clearInterval(pollRef.current);
  }, []);

  const applyFilters = () => { setApplied(filters); loadLeads(filters); };
  const resetFilters = () => { setFilters({}); setApplied({}); loadLeads({}); };

  const onGenerate = async () => {
    setError(null);
    setGenerating(true);
    setProgress({ found: 0, target: 50, scanned: 0, status: 'running' });
    try {
      const { runId, target } = await api.startGeneration(filters);
      setProgress((p) => ({ ...p, target: target || 50 }));
      pollRef.current = setInterval(async () => {
        try {
          const run = await api.getRun(runId);
          setProgress({ found: run.found, target: run.target, scanned: run.scanned, status: run.status });
          if (run.status === 'done' || run.status === 'error') {
            clearInterval(pollRef.current);
            setGenerating(false);
            if (run.status === 'error') setError(run.error || 'Generatie mislukt');
            setApplied(filters);
            await Promise.all([loadLeads(filters), loadStats()]);
          }
        } catch (e) {
          clearInterval(pollRef.current);
          setGenerating(false);
          setError(e.message);
        }
      }, 1000);
    } catch (e) {
      setGenerating(false);
      setError(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            AI Lead Finder <span className="text-brand-600">Nederland</span>
          </h1>
          <p className="text-sm text-slate-500">
            Vind bedrijven zonder of met een verouderde website — kansen voor webdesign.
          </p>
        </div>
        <GenerateButton onGenerate={onGenerate} generating={generating} progress={progress} />
      </header>

      {health && (
        <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
          <Badge label={`Bron: ${health.source}`} />
          <Badge label={`Opslag: ${health.storage}`} />
          <Badge label={`Queue: ${health.queue}`} />
          <Badge label={`AI: ${health.ai}`} />
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="mb-6"><StatsBar stats={stats} /></div>

      <div className="mb-6"><Filters filters={filters} setFilters={setFilters} onApply={applyFilters} onReset={resetFilters} /></div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">
          {leads.length} leads{Object.keys(applied).length ? ' (gefilterd)' : ''}
        </h2>
        <ExportBar filters={applied} leads={leads} />
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Laden…</div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-slate-500">Nog geen leads. Klik op <b>Genereer 50 Leads</b> om te starten.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((l) => <LeadCard key={l.id ?? l.dedupeKey} lead={l} />)}
        </div>
      )}
    </div>
  );
}

function Badge({ label }) {
  return <span className="rounded-full bg-slate-200 px-2.5 py-1 font-medium text-slate-600">{label}</span>;
}
