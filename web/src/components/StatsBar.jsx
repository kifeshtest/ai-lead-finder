const CARDS = [
  { key: 'total', label: 'Totaal leads', accent: 'text-slate-900' },
  { key: 'hot', label: 'Hoge kans', accent: 'text-emerald-600' },
  { key: 'withoutWebsite', label: 'Zonder website', accent: 'text-rose-600' },
  { key: 'analyzed', label: 'Geanalyseerd', accent: 'text-brand-600' },
  { key: 'analysisPending', label: 'In analyse', accent: 'text-amber-600' },
  { key: 'avgLeadScore', label: 'Gem. leadscore', accent: 'text-slate-900' },
];

export default function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map((c) => (
        <div key={c.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className={`text-3xl font-extrabold tracking-tight ${c.accent}`}>{stats?.[c.key] ?? '—'}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
