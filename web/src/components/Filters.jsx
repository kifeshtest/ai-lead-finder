import { PROVINCES, STATUS_OPTIONS } from '../api.js';

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const lbl = 'mb-1 block text-xs font-semibold text-slate-600';

export default function Filters({ filters, setFilters, onApply, onReset }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const chk = (k, label) => (
    <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={!!filters[k]} onChange={(e) => set(k, e.target.checked)} />
      {label}
    </label>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Filters</h2>
        <button onClick={onReset} className="text-xs font-medium text-brand-600 hover:underline">Wissen</button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div className="md:col-span-2">
          <label className={lbl}>Zoeken (naam, plaats, domein, telefoon, e-mail)</label>
          <input className={input} placeholder="Zoek…" value={filters.q || ''} onChange={(e) => set('q', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onApply()} />
        </div>
        <div>
          <label className={lbl}>Provincie</label>
          <select className={input} value={filters.province || ''} onChange={(e) => set('province', e.target.value)}>
            <option value="">Alle</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Plaats</label>
          <input className={input} placeholder="bv. Utrecht" value={filters.city || ''} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Branche</label>
          <input className={input} placeholder="bv. Kapper" value={filters.branche || ''} onChange={(e) => set('branche', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select className={input} value={filters.status || ''} onChange={(e) => set('status', e.target.value)}>
            <option value="">Alle statussen</option>{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Min. leadscore</label>
          <input type="number" min="0" max="100" className={input} value={filters.minLeadScore ?? ''} onChange={(e) => set('minLeadScore', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Max. PageSpeed (mobiel)</label>
          <input type="number" min="0" max="100" className={input} value={filters.maxPageSpeed ?? ''} onChange={(e) => set('maxPageSpeed', e.target.value)} />
        </div>
        {chk('hasWebsite', 'Heeft website')}
        {chk('onlyNoWebsite', 'Geen website')}
        {chk('onlyEmail', 'Met e-mail')}
        {chk('hasPhone', 'Met telefoon')}
        {chk('favorite', 'Favorieten')}
        {chk('analysisDone', 'Alleen geanalyseerd')}
      </div>
      <div className="mt-4">
        <button onClick={onApply} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filters toepassen</button>
      </div>
    </div>
  );
}
