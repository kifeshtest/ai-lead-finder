import { useState } from 'react';

function scoreBadge(lead) {
  if (!lead.hasWebsite) return { text: 'Geen site', cls: 'bg-slate-200 text-slate-700' };
  const s = lead.websiteScore;
  if (s < 40) return { text: `${s}/100`, cls: 'bg-rose-100 text-rose-700' };
  if (s < 55) return { text: `${s}/100`, cls: 'bg-amber-100 text-amber-700' };
  return { text: `${s}/100`, cls: 'bg-emerald-100 text-emerald-700' };
}

function leadToText(l) {
  return [
    l.companyName, l.branche, `${l.city || ''}${l.province ? ', ' + l.province : ''}`,
    l.phone && `Tel: ${l.phone}`, l.email && `E-mail: ${l.email}`, l.website && `Web: ${l.website}`,
    `Score: ${l.hasWebsite ? l.websiteScore + '/100' : 'geen website'}`,
    `Reden: ${l.reason}`, l.motivation && `Motivatie: ${l.motivation}`,
  ].filter(Boolean).join('\n');
}

export default function LeadCard({ lead, demo, onUpdate }) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(lead.note || '');
  const [saveState, setSaveState] = useState(''); // '' | 'saving' | 'saved' | 'error'
  const badge = scoreBadge(lead);
  const done = lead.status === 'afgehandeld';
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${lead.companyName} ${lead.city || ''}`)}`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${lead.companyName} ${lead.city || ''}`)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(leadToText(lead));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const persist = async (patch) => {
    if (!onUpdate) return;
    setSaveState('saving');
    try {
      await onUpdate(lead.id, patch);
      setSaveState('saved');
      setTimeout(() => setSaveState(''), 1500);
    } catch {
      setSaveState('error');
    }
  };
  const toggleDone = () => persist({ status: done ? 'nieuw' : 'afgehandeld' });
  const saveNote = () => { if ((lead.note || '') !== note) persist({ note }); };

  return (
    <div className={`flex flex-col rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${done ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold leading-tight text-slate-900">{lead.companyName}{done && <span className="ml-2 align-middle text-xs font-semibold text-emerald-600">✓ afgehandeld</span>}</h3>
          <p className="text-sm text-slate-500">
            {lead.branche} · {lead.city}{lead.province ? `, ${lead.province}` : ''}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badge.cls}`}>{badge.text}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(lead.reasonTags || []).slice(0, 4).map((t, i) => (
          <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{t}</span>
        ))}
      </div>

      {lead.motivation && (
        <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm leading-relaxed text-slate-700">{lead.motivation}</p>
      )}

      <dl className="mt-3 space-y-1 text-sm">
        {lead.phone && <div className="flex gap-2"><dt className="w-16 text-slate-400">Tel</dt><dd className="text-slate-700">{lead.phone}</dd></div>}
        {lead.email && <div className="flex gap-2"><dt className="w-16 text-slate-400">E-mail</dt><dd className="truncate text-slate-700">{lead.email}</dd></div>}
        <div className="flex gap-2"><dt className="w-16 text-slate-400">Website</dt><dd className="truncate text-slate-700">{lead.website || '—'}</dd></div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {lead.website && (
          demo ? (
            <a href={searchUrl} target="_blank" rel="noopener noreferrer" title="Demodata: dit is een fictief bedrijf. Deze knop zoekt het op via Google." className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Bedrijf opzoeken
            </a>
          ) : (
            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Website openen
            </a>
          )
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Google Maps
        </a>
        <button onClick={copy} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          {copied ? 'Gekopieerd ✓' : 'Kopiëren'}
        </button>
        <span className="ml-auto text-[11px] text-slate-400">
          {lead.lastChecked ? new Date(lead.lastChecked).toLocaleDateString('nl-NL') : ''}
        </span>
      </div>

      {/* Afvinken + notitie (blijft bewaard in het systeem) */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={done}
              onChange={toggleDone}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            {done ? 'Afgehandeld' : 'Markeer als gebeld / afgehandeld'}
          </label>
          {saveState === 'saving' && <span className="text-[11px] text-slate-400">Opslaan…</span>}
          {saveState === 'saved' && <span className="text-[11px] font-medium text-emerald-600">Opgeslagen ✓</span>}
          {saveState === 'error' && <span className="text-[11px] font-medium text-rose-600">Opslaan mislukt</span>}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          rows={2}
          placeholder="Notitie (bijv. gebeld op 7-7, terugbellen volgende week, geen interesse)…"
          className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
    </div>
  );
}
