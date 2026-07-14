import { useState } from 'react';
import { api } from '../api.js';

export default function ExportBar({ filters }) {
  const [busy, setBusy] = useState(null);
  const dl = async (type) => {
    setBusy(type);
    try { await api.exportDownload(type, filters); } catch (e) { alert(e.message); } finally { setBusy(null); }
  };
  const btn = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={btn} onClick={() => dl('csv')} disabled={busy}>{busy === 'csv' ? '…' : '⬇ CSV'}</button>
      <button className={btn} onClick={() => dl('xlsx')} disabled={busy}>{busy === 'xlsx' ? '…' : '⬇ Excel'}</button>
    </div>
  );
}
