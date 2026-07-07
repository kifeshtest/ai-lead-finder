const CARDS = [
  { key: 'total', label: 'Totaal gevonden leads', accent: 'text-slate-900' },
  { key: 'newToday', label: 'Nieuwe leads vandaag', accent: 'text-brand-600' },
  { key: 'withoutWebsite', label: 'Zonder website', accent: 'text-rose-600' },
  { key: 'poorWebsite', label: 'Zwakke website', accent: 'text-amber-600' },
  { key: 'avgScore', label: 'Gem. websitescore', accent: 'text-emerald-600', suffix: '/100' },
];

export default function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((c) => (
        <div key={c.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className={`text-3xl font-extrabold tracking-tight ${c.accent}`}>
            {stats?.[c.key] ?? '—'}
            {c.suffix && <span className="text-base font-semibold text-slate-400">{c.suffix}</span>}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
