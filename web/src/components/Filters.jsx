import { PROVINCES } from '../api.js';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const labelCls = 'mb-1 block text-xs font-semibold text-slate-600';

export default function Filters({ filters, setFilters, onApply, onReset }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Filters</h2>
        <button onClick={onReset} className="text-xs font-medium text-brand-600 hover:underline">
          Wissen
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div>
          <label className={labelCls}>Provincie</label>
          <select className={inputCls} value={filters.province || ''} onChange={(e) => set('province', e.target.value)}>
            <option value="">Alle provincies</option>
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Plaats</label>
          <input className={inputCls} placeholder="bv. Utrecht" value={filters.city || ''} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Branche</label>
          <input className={inputCls} placeholder="bv. Kapper" value={filters.branche || ''} onChange={(e) => set('branche', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={filters.status || ''} onChange={(e) => set('status', e.target.value)}>
            <option value="">Alle statussen</option>
            <option value="nieuw">Nieuw</option>
            <option value="gemaild">Mail gestuurd (nog te bellen)</option>
            <option value="gebeld">Gebeld</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Min. websitescore</label>
          <input type="number" min="0" max="100" className={inputCls} value={filters.minScore ?? ''} onChange={(e) => set('minScore', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Min. werknemers</label>
          <input type="number" min="0" className={inputCls} value={filters.employeesMin ?? ''} onChange={(e) => set('employeesMin', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Max. werknemers</label>
          <input type="number" min="0" className={inputCls} value={filters.employeesMax ?? ''} onChange={(e) => set('employeesMax', e.target.value)} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={!!filters.onlyNoWebsite} onChange={(e) => set('onlyNoWebsite', e.target.checked)} />
          Alleen zonder website
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={!!filters.onlyOutdated} onChange={(e) => set('onlyOutdated', e.target.checked)} />
          Alleen verouderde website
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={!!filters.onlyEmail} onChange={(e) => set('onlyEmail', e.target.checked)} />
          Alleen met e-mailadres
        </label>
      </div>

      <div className="mt-4">
        <button onClick={onApply} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Filters toepassen
        </button>
      </div>
    </div>
  );
}
