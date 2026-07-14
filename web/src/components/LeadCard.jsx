import { useState } from 'react';
import { STATUS_OPTIONS } from '../api.js';

const psColor = (s) =>
  s == null ? 'bg-slate-200 text-slate-600'
  : s < 50 ? 'bg-rose-100 text-rose-700'
  : s < 90 ? 'bg-amber-100 text-amber-700'
  : 'bg-emerald-100 text-emerald-700';

const labelColor = (label) => ({
  'Hoge kans': 'bg-emerald-600 text-white',
  'Interessante kans': 'bg-amber-500 text-white',
  'Gemiddelde kans': 'bg-slate-500 text-white',
  'Lage prioriteit': 'bg-slate-300 text-slate-700',
  'Handmatige controle nodig': 'bg-rose-500 text-white',
}[label] || 'bg-slate-300 text-slate-700');

const analysisBadge = (s) => ({
  wacht: ['Wacht op analyse', 'text-slate-500'],
  bezig: ['Analyse loopt…', 'text-brand-600'],
  voltooid: ['Geanalyseerd', 'text-emerald-600'],
  mislukt: ['Analyse mislukt', 'text-rose-600'],
  nvt: ['Geen website', 'text-slate-400'],
}[s] || ['', 'text-slate-400']);

function leadToText(l) {
  return [
    l.companyName, `${l.branche || ''} · ${l.city || ''}`,
    l.phone && `Tel: ${l.phone}`, l.email && `Mail: ${l.email}`, l.website && `Web: ${l.website}`,
    `Leadscore: ${l.leadScore ?? '-'} (${l.label || '-'})`,
    l.pagespeed?.performance != null && `PageSpeed mobiel: ${l.pagespeed.performance}/100, SEO ${l.pagespeed.seo}/100`,
    l.talkingPoints?.length && `Gesprekspunten:\n- ${l.talkingPoints.join('\n- ')}`,
    l.openingLine && `Opening: ${l.openingLine}`,
  ].filter(Boolean).join('\n');
}

export default function LeadCard({ lead, onUpdate, onReanalyze, onDelete }) {
  const [note, setNote] = useState(lead.note || '');
  const [saved, setSaved] = useState('');
  const [copied, setCopied] = useState(false);

  const patch = async (p) => { setSaved('saving'); try { await onUpdate(lead.id, p); setSaved('ok'); setTimeout(() => setSaved(''), 1200); } catch { setSaved('err'); } };
  const copy = async () => { try { await navigator.clipboard.writeText(leadToText(lead)); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {} };
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${lead.companyName} ${lead.city || ''}`)}`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${lead.companyName} ${lead.city || ''}`)}`;
  const [aLabel, aColor] = analysisBadge(lead.analysisStatus);
  const ps = lead.pagespeed || {};

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Kop */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-slate-900">{lead.companyName}</h3>
          <p className="truncate text-sm text-slate-500">{lead.branche} · {lead.city}{lead.province ? `, ${lead.province}` : ''}</p>
        </div>
        <button onClick={() => patch({ favorite: !lead.favorite })} title="Favoriet"
          className={`shrink-0 text-xl leading-none ${lead.favorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}>★</button>
      </div>

      {/* Score-badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {lead.leadScore != null && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${labelColor(lead.label)}`}>{lead.label} · {lead.leadScore}</span>
        )}
        {!lead.hasWebsite && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Geen website</span>}
        {lead.hasWebsite && (
          <>
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${psColor(ps.performance)}`}>PageSpeed {ps.performance ?? '—'}</span>
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${psColor(ps.seo)}`}>SEO {ps.seo ?? '—'}</span>
          </>
        )}
        {lead.confidence != null && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">Betrouwbaar {lead.confidence}%</span>}
        <span className={`ml-auto text-[11px] font-medium ${aColor}`}>{aLabel}</span>
      </div>

      {/* Gesprekspunten */}
      {(lead.talkingPoints?.length > 0 || lead.openingLine || !lead.hasWebsite) && (
        <div className="mt-3 rounded-lg bg-brand-50 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">Gesprekspunten</p>
          {lead.talkingPoints?.length > 0 ? (
            <ul className="ml-1 list-disc space-y-1 pl-4 text-[13px] leading-snug text-slate-700">
              {lead.talkingPoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          ) : (
            <p className="text-[13px] text-slate-600">{lead.hasWebsite ? 'Nog geen analyse — wordt op de achtergrond uitgevoerd.' : lead.motivation}</p>
          )}
          {lead.positiveNote && <p className="mt-2 text-[12px] italic text-emerald-700">👍 {lead.positiveNote}</p>}
          {lead.openingLine && <p className="mt-2 border-t border-brand-100 pt-2 text-[12px] text-slate-600"><b>Opening:</b> “{lead.openingLine}”</p>}
        </div>
      )}

      {/* Contact */}
      <dl className="mt-3 space-y-1 text-sm">
        {lead.phone && <div className="flex gap-2"><dt className="w-14 text-slate-400">Tel</dt><dd className="text-slate-700">{lead.phone}</dd></div>}
        {lead.email && <div className="flex gap-2"><dt className="w-14 text-slate-400">Mail</dt><dd className="truncate text-slate-700">{lead.email}</dd></div>}
        <div className="flex gap-2"><dt className="w-14 text-slate-400">Web</dt><dd className="truncate text-slate-700">{lead.website || '—'}</dd></div>
      </dl>

      {/* CRM */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
        <select value={lead.status || 'nieuw'} onChange={(e) => patch({ status: e.target.value })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" value={lead.followUpDate ? String(lead.followUpDate).slice(0, 10) : ''} onChange={(e) => patch({ followUpDate: e.target.value })}
          title="Opvolgdatum" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-600" />
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => { if ((lead.note || '') !== note) patch({ note }); }}
        rows={2} placeholder="Notitie (bijv. gebeld op…, contactpersoon, afspraak)…"
        className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />

      {/* Acties */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href={lead.website || searchUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{lead.website ? 'Website' : 'Opzoeken'}</a>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Maps</a>
        <button onClick={copy} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{copied ? 'Gekopieerd ✓' : 'Kopiëren'}</button>
        {lead.hasWebsite && <button onClick={() => onReanalyze(lead.id)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Heranalyseren</button>}
        <button onClick={() => onDelete(lead.id)} title="Verwijderen" className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">🗑</button>
        {saved === 'saving' && <span className="ml-auto text-[11px] text-slate-400">Opslaan…</span>}
        {saved === 'ok' && <span className="ml-auto text-[11px] font-medium text-emerald-600">Opgeslagen ✓</span>}
        {saved === 'err' && <span className="ml-auto text-[11px] font-medium text-rose-600">Mislukt</span>}
      </div>
    </div>
  );
}
